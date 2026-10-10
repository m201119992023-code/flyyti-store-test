import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // حساب نطاق التاريخ لليوم الحالي (من بداية اليوم وحتى نهايته)
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), extra_services(*)')
      .gte('created_at', start)
      .lte('created_at', end);

    if (!invoices || invoices.length === 0) {
      return res.status(200).json({ message: 'No sales today' });
    }

    const salesRows: any[] = [];
    let summary = { gross: 0, disc: 0, net: 0, cost: 0, profit: 0, qty: 0 };

    invoices.forEach(inv => {
      // حساب نسبة الخصم الموزعة على الأصناف
      const discFactor = inv.discount > 0 ? (inv.discount / inv.total_amount) : 0;
      
      inv.invoice_items.forEach((it: any) => {
        const lineTotal = it.sale_price * it.quantity;
        const lineDisc = lineTotal * discFactor;
        const lineProfit = (it.sale_price - it.cost_price) * it.quantity - lineDisc;
        
        salesRows.push({
          "الوقت": new Date(inv.created_at).toLocaleTimeString('ar-EG'),
          "رقم الفاتورة": inv.id,
          "الصنف": it.product_name,
          "النوع": it.variant_name,
          "الكمية": it.quantity,
          "التكلفة/قطعة": it.cost_price,
          "البيع/قطعة": it.sale_price,
          "الخصم المنسوب": Math.round(lineDisc),
          "صافي الربح": Math.round(lineProfit)
        });
        summary.qty += it.quantity;
      });

      inv.extra_services.forEach((ser: any) => {
        const lineTotal = ser.sale_price * ser.quantity;
        const lineDisc = lineTotal * discFactor;
        const lineProfit = (ser.sale_price - ser.cost_price) * ser.quantity - lineDisc;
        
        salesRows.push({
          "الوقت": new Date(inv.created_at).toLocaleTimeString('ar-EG'),
          "رقم الفاتورة": inv.id,
          "الصنف": `${ser.name} (خدمة)`,
          "النوع": ser.service_type,
          "الكمية": ser.quantity,
          "التكلفة/قطعة": ser.cost_price,
          "البيع/قطعة": ser.sale_price,
          "الخصم المنسوب": Math.round(lineDisc),
          "صافي الربح": Math.round(lineProfit)
        });
        summary.qty += ser.quantity;
      });

      summary.gross += Number(inv.total_amount);
      summary.disc += Number(inv.discount);
      summary.net += Number(inv.net_amount);
      summary.cost += Number(inv.total_cost);
      summary.profit += Number(inv.profit);
    });

    const wb = XLSX.utils.book_new();
    const wsSales = XLSX.utils.json_to_sheet(salesRows);
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales");

    const summaryData = [
      ["الملخص المالي لليوم"],
      ["التاريخ", now.toLocaleDateString('ar-EG')],
      [],
      ["إجمالي المبيعات", Math.round(summary.gross)],
      ["إجمالي الخصم", Math.round(summary.disc)],
      ["صافي المبيعات", Math.round(summary.net)],
      ["إجمالي التكلفة", Math.round(summary.cost)],
      ["صافي الربح النهائي", Math.round(summary.profit)],
      ["إجمالي القطع", summary.qty],
      ["عدد الفواتير", invoices.length]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Flyyti_Daily_Sales_${now.toISOString().split('T')[0]}.xlsx`;

    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID!);
    formData.append('caption', `📊 *التقرير اليومي للمبيعات*\nتاريخ: ${now.toLocaleDateString('ar-EG')}\nإجمالي الربح: *${Math.round(summary.profit)} ₪*`);
    
    // إنشاء Blob من البفر لإرساله كملف
    const fileBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('document', fileBlob, filename);

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
