import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isVercelCron(req: any) {
  const ua = String(req?.headers?.["user-agent"] || "").toLowerCase();
  return ua.includes("vercel-cron");
}

export default async function handler(req: any, res: any) {

  try {

    if (!isVercelCron(req)) {
      return res.status(401).send("Unauthorized");
    }

    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,0,0
    ).toISOString();

    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,59,59
    ).toISOString();



    // =====================
    // SALES (رجعناه مثل الكود الأصلي)
    // =====================

    const { data: invoices } = await supabase
      .from("invoices")
      .select("*, invoice_items(*), extra_services(*)")
      .gte("created_at", start)
      .lte("created_at", end);


    const salesRows:any[] = [];

    let summary = {
      gross:0,
      disc:0,
      net:0,
      cost:0,
      profit:0,
      qty:0
    };


    (invoices || []).forEach((inv:any)=>{

      const totalAmount = Number(inv.total_amount) || 0;
      const invoiceDiscount = Number(inv.discount) || 0;

      const discFactor =
        totalAmount > 0
          ? invoiceDiscount / totalAmount
          : 0;


      (inv.invoice_items || []).forEach((it:any)=>{

        const lineTotal =
          Number(it.sale_price) * Number(it.quantity);

        const lineDisc = lineTotal * discFactor;

        const lineProfit =
          (Number(it.sale_price) - Number(it.cost_price)) *
          Number(it.quantity) - lineDisc;

        salesRows.push({

          "الوقت": new Date(inv.created_at).toLocaleTimeString("ar-EG"),
          "رقم الفاتورة": inv.id,
          "الصنف": it.product_name,
          "النوع": it.variant_name,
          "الكمية": it.quantity,
          "التكلفة": it.cost_price,
          "البيع": it.sale_price,
          "الخصم": Math.round(lineDisc),
          "الربح": Math.round(lineProfit)

        });

        summary.qty += Number(it.quantity) || 0;

      });


      (inv.extra_services || []).forEach((ser:any)=>{

        const lineTotal =
          Number(ser.sale_price) * Number(ser.quantity);

        const lineDisc = lineTotal * discFactor;

        const lineProfit =
          (Number(ser.sale_price) - Number(ser.cost_price)) *
          Number(ser.quantity) - lineDisc;

        salesRows.push({

          "الوقت": new Date(inv.created_at).toLocaleTimeString("ar-EG"),
          "رقم الفاتورة": inv.id,
          "الصنف": `${ser.name} (خدمة)`,
          "النوع": ser.service_type || "—",
          "الكمية": ser.quantity,
          "التكلفة": ser.cost_price,
          "البيع": ser.sale_price,
          "الخصم": Math.round(lineDisc),
          "الربح": Math.round(lineProfit)

        });

        summary.qty += Number(ser.quantity) || 0;

      });


      summary.gross += Number(inv.total_amount) || 0;
      summary.disc += Number(inv.discount) || 0;
      summary.net += Number(inv.net_amount) || 0;
      summary.cost += Number(inv.total_cost) || 0;
      summary.profit += Number(inv.profit) || 0;

    });



    // =====================
    // INVENTORY
    // =====================

    const { data: products } = await supabase
      .from("products")
      .select("id,name,category_id,sub_category_id");

    const { data: variants } = await supabase
      .from("variants")
      .select("*");


    const productsMap:any = {};

    (products || []).forEach((p:any)=>{
      productsMap[p.id] = p;
    });


    const inventoryRows:any[] = [];


    const sortedVariants = (variants || []).sort((a:any,b:any)=>{

      const pa = productsMap[a.product_id] || {};
      const pb = productsMap[b.product_id] || {};

      const catA = pa.category_id || "";
      const catB = pb.category_id || "";

      const subA = pa.sub_category_id || "";
      const subB = pb.sub_category_id || "";

      if(catA !== catB) return catA.localeCompare(catB);
      if(subA !== subB) return subA.localeCompare(subB);

      return (pa.name || "").localeCompare(pb.name || "");

    });


    sortedVariants.forEach((v:any)=>{

      const product = productsMap[v.product_id] || {};

      inventoryRows.push({

        "القسم الرئيسي": product.category_id || "",
        "القسم الفرعي": product.sub_category_id || "",
        "اسم الصنف": product.name || "",
        "النوع": v.name || "",
        "الباركود": v.barcode || "",
        "المورد": v.supplier || "",
        "الشركة المصنعه": v.manufacturer || "",
        "التكلفه": v.cost_price || 0,
        "البيع": v.sale_price || 0,
        "خصم مقترح": v.suggested_discount || 0,
        "الكميه": v.stock_quantity || 0

      });

    });



    // =====================
    // Excel
    // =====================

    const wb = XLSX.utils.book_new();

    const wsSales = XLSX.utils.json_to_sheet(salesRows);
    XLSX.utils.book_append_sheet(wb, wsSales, "Sales");

    const summaryData = [
      ["ملخص اليوم"],
      ["التاريخ", now.toLocaleDateString("ar-EG")],
      [],
      ["إجمالي المبيعات", summary.gross],
      ["إجمالي الخصم", summary.disc],
      ["صافي المبيعات", summary.net],
      ["إجمالي التكلفة", summary.cost],
      ["صافي الربح", summary.profit],
      ["عدد القطع", summary.qty],
      ["عدد الفواتير", invoices?.length || 0]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    const wsInventory = XLSX.utils.json_to_sheet(inventoryRows);
    XLSX.utils.book_append_sheet(wb, wsInventory, "Inventory");


    const buffer = XLSX.write(wb,{
      type:"buffer",
      bookType:"xlsx"
    });

    const filename =
      `Flyyti_Report_${now.toISOString().split("T")[0]}.xlsx`;


    const formData = new FormData();

    formData.append("chat_id", TELEGRAM_CHAT_ID!);

    formData.append(
      "caption",
      `📊 التقرير اليومي
📅 ${now.toLocaleDateString("ar-EG")}
💰 الربح: ${Math.round(summary.profit)} ₪`
    );


    const blob = new Blob(
      [buffer],
      {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
    );

    formData.append("document", blob, filename);

    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
      {
        method:"POST",
        body:formData
      }
    );

    return res.status(200).json({ok:true});

  } catch(err:any){

    console.error(err);

    return res.status(500).json({
      error:err.message
    });

  }

}
