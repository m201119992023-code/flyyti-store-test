import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { invoiceId } = req.body;
  if (!invoiceId) return res.status(400).json({ error: 'Missing invoiceId' });

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: inv, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*), extra_services(*)')
      .eq('id', invoiceId)
      .single();

    if (error || !inv) throw new Error("Invoice not found");

    const date = new Date(inv.created_at).toLocaleString('ar-EG', { timeZone: 'Asia/Hebron' });
    
    // Proportional Discount Logic
    const totalLinesBeforeDisc = [...inv.invoice_items, ...inv.extra_services].reduce((sum, it) => sum + (it.sale_price * it.quantity), 0);
    const discFactor = inv.discount > 0 ? (inv.discount / totalLinesBeforeDisc) : 0;

    let message = `💰 *عملية بيع جديدة*\n`;
    message += `🔢 رقم الفاتورة: \`${inv.id}\`\n`;
    message += `📅 التاريخ: ${date}\n`;
    message += `──────────────────\n`;

    inv.invoice_items.forEach((it: any) => {
      const lineTotal = it.sale_price * it.quantity;
      const lineDisc = lineTotal * discFactor;
      const lineProfit = (it.sale_price - it.cost_price) * it.quantity - lineDisc;
      
      message += `▫️ *${it.product_name}*\n`;
      message += `🏷️ النوع: ${it.variant_name || 'افتراضي'}\n`;
      message += `📦 الكمية: ${it.quantity}\n`;
      message += `💵 السعر: ${it.sale_price} ₪\n`;
      message += `✂️ خصم منسوب: ${Math.round(lineDisc)} ₪\n`;
      message += `📈 الربح: *${Math.round(lineProfit)} ₪*\n\n`;
    });

    inv.extra_services.forEach((ser: any) => {
      const lineTotal = ser.sale_price * ser.quantity;
      const lineDisc = lineTotal * discFactor;
      const lineProfit = (ser.sale_price - ser.cost_price) * ser.quantity - lineDisc;

      message += `🛠️ *${ser.name}* (خدمة)\n`;
      message += `🏷️ النوع: ${ser.service_type}\n`;
      message += `💵 السعر: ${ser.sale_price} ₪\n`;
      message += `✂️ خصم منسوب: ${Math.round(lineDisc)} ₪\n`;
      message += `📈 الربح: *${Math.round(lineProfit)} ₪*\n\n`;
    });

    message += `──────────────────\n`;
    message += `🏷️ المجموع: ${Math.round(inv.total_amount)} ₪\n`;
    message += `✂️ إجمالي الخصم: ${Math.round(inv.discount)} ₪\n`;
    message += `💳 الصافي: *${Math.round(inv.net_amount)} ₪*\n`;
    message += `📉 التكلفة: ${Math.round(inv.total_cost)} ₪\n`;
    message += `💎 الربح الصافي: *${Math.round(inv.profit)} ₪*`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}