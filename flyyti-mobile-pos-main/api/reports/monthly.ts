import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req:any,res:any){

try{

const supabase = createClient(SUPABASE_URL!,SUPABASE_SERVICE_ROLE_KEY!)

const now = new Date()

// الشهر السابق
const firstDay = new Date(now.getFullYear(), now.getMonth()-1,1).toISOString()
const lastDay = new Date(now.getFullYear(), now.getMonth(),0,23,59,59).toISOString()

const monthDate = new Date(now.getFullYear(), now.getMonth()-1,1)
const monthLabel = monthDate.toLocaleDateString('ar-EG',{month:'long',year:'numeric'})

const {data:invoices} = await supabase
.from('invoices')
.select('*, invoice_items(*), extra_services(*)')
.gte('created_at',firstDay)
.lte('created_at',lastDay)

const {data:expenses} = await supabase
.from('expenses')
.select('*')
.gte('date',firstDay)
.lte('date',lastDay)

const {data:purchases} = await supabase
.from('purchases')
.select('*')
.gte('date',firstDay)
.lte('date',lastDay)

if(!invoices || invoices.length===0){
return res.status(200).json({message:"no sales"})
}

let productSalesTotal = 0
let productCostTotal = 0
let serviceSalesTotal = 0
let serviceCostTotal = 0
let totalDiscount = 0
let itemsSoldTotal = 0

const salesRows:any[] = []

invoices.forEach(inv=>{

const invDiscRatio = inv.total_amount>0 ? (inv.discount/inv.total_amount) : 0

let currentInvProductSales = 0
let currentInvProductCost = 0

inv.invoice_items?.forEach((it:any)=>{

itemsSoldTotal += it.quantity

const sale = it.sale_price * it.quantity
const cost = it.cost_price * it.quantity

const lineNetSale = sale * (1 - invDiscRatio)
const lineNetProfit = lineNetSale - cost

productSalesTotal += sale
productCostTotal += cost
currentInvProductSales += sale
currentInvProductCost += cost

salesRows.push({
"التاريخ": new Date(inv.created_at).toLocaleDateString('ar-EG'),
"رقم الفاتورة": inv.id,
"الصنف": it.product_name,
"النوع": it.variant_name || "---",
"الكمية": it.quantity,
"التكلفة": it.cost_price,
"البيع": it.sale_price,
"صافي البيع": Math.round(lineNetSale),
"صافي الربح": Math.round(lineNetProfit)
})

})

let currentInvServiceProfit = 0

inv.extra_services?.forEach((ser:any)=>{

const qty = Number(ser.quantity)||1

itemsSoldTotal += qty

const serviceSale = ser.sale_price * qty
const serviceCost = ser.cost_price * qty
const serviceProfit = serviceSale - serviceCost

serviceSalesTotal += serviceSale
serviceCostTotal += serviceCost
currentInvServiceProfit += serviceProfit

salesRows.push({
"التاريخ": new Date(inv.created_at).toLocaleDateString('ar-EG'),
"رقم الفاتورة": inv.id,
"الصنف": ser.name,
"النوع": ser.service_type || "خدمة",
"الكمية": qty,
"التكلفة": ser.cost_price,
"البيع": ser.sale_price,
"صافي البيع": serviceSale,
"صافي الربح": serviceProfit
})

})

totalDiscount += Number(inv.discount)

})

const totalExpenses = expenses?.reduce((s,e)=>s+Number(e.amount),0) || 0
const totalPurchases = purchases?.reduce((s,p)=>s+Number(p.amount),0) || 0

const serviceProfitTotal = serviceSalesTotal - serviceCostTotal

const displayGrossSales = (productSalesTotal - totalDiscount) + serviceProfitTotal
const displayNetSales = displayGrossSales - totalExpenses - totalPurchases

const displayGrossCost = productCostTotal
const displayNetCost = displayGrossCost - totalPurchases

const displayGrossProfit = (productSalesTotal - productCostTotal - totalDiscount) + serviceProfitTotal
const displayNetProfit = displayGrossProfit - totalExpenses

const discountPercentage = (productSalesTotal>0)
? (totalDiscount/productSalesTotal)*100
:0

const wb = XLSX.utils.book_new()

const wsSales = XLSX.utils.json_to_sheet(salesRows)

XLSX.utils.book_append_sheet(wb,wsSales,"Monthly Detail")

const summarySheet = [

["التقرير المالي الشهري"],
["الشهر",monthLabel],
[],
["اجمالي المبيعات",Math.round(displayGrossSales)],
["صافي المبيعات",Math.round(displayNetSales)],
["مجموع الجملة",Math.round(displayGrossCost)],
["صافي الجملة",Math.round(displayNetCost)],
["اجمالي الربح",Math.round(displayGrossProfit)],
["صافي الربح",Math.round(displayNetProfit)],
["اجمالي عدد القطع المباعة",itemsSoldTotal],
["اجمالي الخصم",Math.round(totalDiscount)],
["نسبة الخصم",discountPercentage.toFixed(2)+"%"],
["اجمالي المصاريف",Math.round(totalExpenses)],
["اجمالي المشتريات",Math.round(totalPurchases)],
["عدد الفواتير",invoices.length]

]

const wsSummary = XLSX.utils.aoa_to_sheet(summarySheet)

XLSX.utils.book_append_sheet(wb,wsSummary,"Summary")

const buffer = XLSX.write(wb,{type:'buffer',bookType:'xlsx'})

const filename = `Flyyti_Report_${monthLabel}.xlsx`

const formData = new FormData()

formData.append('chat_id',TELEGRAM_CHAT_ID!)
formData.append('caption',`📊 التقرير الشهري\n${monthLabel}\nصافي الربح: ${Math.round(displayNetProfit)} ₪`)
formData.append('document',new Blob([buffer]),filename)

await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,{
method:'POST',
body:formData
})

return res.status(200).json({success:true})

}catch(err:any){

console.error(err)

return res.status(500).json({error:err.message})

}

}
