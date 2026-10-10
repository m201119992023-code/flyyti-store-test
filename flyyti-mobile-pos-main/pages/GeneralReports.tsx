import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BarChart3, 
  Calendar, 
  ChevronDown, 
  Package, 
  ShoppingCart,
  Zap,
  TrendingUp,
  DollarSign,
  Wallet,
  PieChart,
  ChevronUp,
  Target,
  FileDown,
  UploadCloud,
  FileSpreadsheet,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Trophy,
  History,
  Wrench,
  Cog,
  Cpu,
  Hash,
  Percent,
  Scale,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  ListFilter,
  Save,
  Clock
} from 'lucide-react';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';

const GeneralReports: React.FC = () => {
  const [period, setPeriod] = useState<'day' | 'month' | 'year' | 'custom'>('day');
  const [dateRange, setDateRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState<'products' | 'services' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [openSections, setOpenSections] = useState({
    topItems: true,
    topServices: true,
    detailedServices: false,
    dailyPerformance: true
  });

  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [stats, setStats] = useState({
    displayGrossSales: 0,
    displayNetSales: 0,
    displayGrossCost: 0,
    displayNetCost: 0,
    displayGrossProfit: 0,
    displayNetProfit: 0,
    totalExpenses: 0,
    totalPurchases: 0,
    itemsSold: 0,
    totalDiscount: 0,
    invoiceCount: 0,
    discountPercentage: 0,
    topItems: [] as any[],
    serviceTypeStats: [] as any[],
    detailedServicesList: [] as any[],
    dailySummary: [] as any[]
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let start = new Date(dateRange.start + 'T00:00:00Z').toISOString();
      let end = new Date(dateRange.end + 'T23:59:59Z').toISOString();

      const { data: invoices } = await supabase.from('invoices').select('*, invoice_items(*), extra_services(*)').gte('created_at', start).lte('created_at', end);
      const { data: expenses } = await supabase.from('expenses').select('*').gte('date', dateRange.start).lte('date', dateRange.end);
      const { data: purchases } = await supabase.from('purchases').select('*').gte('date', dateRange.start).lte('date', dateRange.end);

      const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const totalPurchases = purchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      if (invoices) {
        let productSalesTotal = 0;
        let productCostTotal = 0;
        let serviceSalesTotal = 0;
        let serviceCostTotal = 0;
        let totalDiscount = 0;
        let itemsSoldTotal = 0;
        let invoiceCount = invoices.length;
        
        const itemCounts: Record<string, any> = {};
        const typeCounts: Record<string, any> = {
          'صيانة': { name: 'صيانة', qty: 0, total: 0, profit: 0, icon: Wrench, color: 'emerald' },
          'خدمة': { name: 'خدمة', qty: 0, total: 0, profit: 0, icon: Cog, color: 'blue' },
          'أجهزة': { name: 'أجهزة', qty: 0, total: 0, profit: 0, icon: Cpu, color: 'slate' }
        };
        const detailedServices: any[] = [];
        const dailyMap: Record<string, any> = {};

        invoices.forEach(inv => {
          const dateKey = new Date(inv.created_at).toLocaleDateString('en-CA');
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { date: dateKey, sales: 0, profit: 0, count: 0 };
          }
          
          totalDiscount += Number(inv.discount);

          let currentInvProductSales = 0;
          let currentInvProductCost = 0;

          // حساب نسبة الخصم الموزعة على هذه الفاتورة
          const invDiscRatio = inv.total_amount > 0 ? (inv.discount / inv.total_amount) : 0;

          inv.invoice_items?.forEach((it: any) => {
            itemsSoldTotal += it.quantity;
            const sale = (it.sale_price * it.quantity);
            const cost = (it.cost_price * it.quantity);
            
            // حساب صافي البيع والربح للصنف بناءً على خصم الفاتورة
            const lineNetSale = sale * (1 - invDiscRatio);
            const lineNetProfit = lineNetSale - cost;

            productSalesTotal += sale;
            productCostTotal += cost;
            currentInvProductSales += sale;
            currentInvProductCost += cost;
            
            const key = `${it.product_name}-${it.variant_name}`;
            if (!itemCounts[key]) itemCounts[key] = { name: it.product_name, variant: it.variant_name, qty: 0, total: 0, profit: 0 };
            itemCounts[key].qty += it.quantity;
            itemCounts[key].total += lineNetSale; // تخزين الصافي بعد الخصم
            itemCounts[key].profit += lineNetProfit; // تخزين الربح الصافي بعد الخصم
          });

          let currentInvServiceProfit = 0;

          inv.extra_services?.forEach((ser: any) => {
            const qty = Number(ser.quantity) || 1;
            itemsSoldTotal += qty;
            const serviceSale = ser.sale_price * qty;
            const serviceCost = ser.cost_price * qty;
            const serviceProfit = serviceSale - serviceCost;

            serviceSalesTotal += serviceSale;
            serviceCostTotal += serviceCost;
            currentInvServiceProfit += serviceProfit;

            const type = ser.service_type || 'خدمة';
            if (typeCounts[type]) {
              typeCounts[type].qty += qty;
              typeCounts[type].total += serviceSale;
              typeCounts[type].profit += serviceProfit;
            }

            detailedServices.push({
              date: dateKey,
              name: ser.name,
              type: type,
              cost: serviceCost,
              sale: serviceSale
            });
          });

          const currentInvGrossSales = (currentInvProductSales - inv.discount) + currentInvServiceProfit;
          const currentInvGrossProfit = (currentInvProductSales - currentInvProductCost - inv.discount) + currentInvServiceProfit;
          
          dailyMap[dateKey].sales += currentInvGrossSales;
          dailyMap[dateKey].profit += currentInvGrossProfit;
          dailyMap[dateKey].count += 1;
        });

        const serviceProfitTotal = serviceSalesTotal - serviceCostTotal;

        const displayGrossSales = (productSalesTotal - totalDiscount) + serviceProfitTotal;
        const displayNetSales = displayGrossSales - totalExpenses - totalPurchases;
        const displayGrossCost = productCostTotal;
        const displayNetCost = displayGrossCost - totalPurchases;
        const displayGrossProfit = (productSalesTotal - productCostTotal - totalDiscount) + serviceProfitTotal;
        const displayNetProfit = displayGrossProfit - totalExpenses;
        
        const discountPercentage = (productSalesTotal > 0) ? (totalDiscount / productSalesTotal) * 100 : 0;

        setStats({
          displayGrossSales,
          displayNetSales,
          displayGrossCost,
          displayNetCost,
          displayGrossProfit,
          displayNetProfit,
          totalExpenses,
          totalPurchases,
          itemsSold: itemsSoldTotal,
          totalDiscount,
          invoiceCount,
          discountPercentage,
          topItems: Object.values(itemCounts).sort((a, b) => b.qty - a.qty),
          serviceTypeStats: Object.values(typeCounts).sort((a, b) => b.qty - a.qty),
          detailedServicesList: detailedServices.sort((a, b) => b.date.localeCompare(a.date)),
          dailySummary: Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date))
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handlePeriodChange = (p: typeof period) => {
    setPeriod(p);
    const now = new Date();
    if (p === 'day') {
      const d = now.toISOString().split('T')[0];
      setDateRange({ start: d, end: d });
    } else if (p === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      setDateRange({ start, end });
    } else if (p === 'year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      setDateRange({ start, end });
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !showImportModal) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        let successCount = 0;
        let skipCount = 0;

        for (const row of rows) {
          const rawDate = showImportModal === 'products' ? row['تاريخ المبيعة'] : row['التاريخ'];
          if (!rawDate) { skipCount++; continue; }

          let saleDate: string;
          if (typeof rawDate === 'number') {
            const dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            saleDate = dateObj.toISOString();
          } else {
            saleDate = new Date(rawDate).toISOString();
          }

          const invoiceId = `hist_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

          if (showImportModal === 'products') {
            const barcode = row['الباركود']?.toString().trim();
            const quantity = Number(row['الكمية']) || 0;
            const salePrice = Number(row['سعر البيع']) || 0;

            if (!barcode || quantity <= 0) { skipCount++; continue; }

            const { data: variant } = await supabase
              .from('variants')
              .select('*, products(name)')
              .eq('barcode', barcode)
              .maybeSingle();

            if (!variant) { skipCount++; continue; }

            const totalCost = Number(variant.cost_price) * quantity;
            const totalAmount = salePrice * quantity;
            const profit = totalAmount - totalCost;

            const { error: invErr } = await supabase.from('invoices').insert({
              id: invoiceId, total_amount: totalAmount, discount: 0,
              net_amount: totalAmount, total_cost: totalCost, profit: profit,
              created_at: saleDate
            });

            if (!invErr) {
              await supabase.from('invoice_items').insert({
                invoice_id: invoiceId, variant_id: variant.id,
                product_name: (variant.products as any).name,
                variant_name: variant.name, quantity: quantity,
                cost_price: variant.cost_price, sale_price: salePrice
              });
              await supabase.from('variants').update({ stock_quantity: variant.stock_quantity - quantity }).eq('id', variant.id);
              successCount++;
            } else skipCount++;

          } else if (showImportModal === 'services') {
            const serviceName = row['اسم الخدمة']?.toString().trim();
            const serviceType = row['نوع الخدمة'] || 'خدمة';
            const costPrice = Number(row['التكلفه']) || 0;
            const salePrice = Number(row['البيع']) || 0;

            if (!serviceName) { skipCount++; continue; }

            const totalCost = costPrice;
            const totalAmount = salePrice;
            const profit = totalAmount - totalCost;

            const { error: invErr } = await supabase.from('invoices').insert({
              id: invoiceId, total_amount: totalAmount, discount: 0,
              net_amount: totalAmount, total_cost: totalCost, profit: profit,
              created_at: saleDate
            });

            if (!invErr) {
              await supabase.from('extra_services').insert({
                invoice_id: invoiceId, name: serviceName, service_type: serviceType,
                cost_price: costPrice, sale_price: salePrice, quantity: 1
              });
              successCount++;
            } else skipCount++;
          }
        }

        showToast(`تم استيراد ${successCount} سجل بنجاح. (تخطي: ${skipCount})`);
        fetchData();
        setShowImportModal(null);
      } catch (err) {
        console.error(err);
        showToast("خطأ في معالجة الملف", "error");
      } finally {
        setImporting(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ["تقرير الأداء المالي الموحد"],
      ["الفترة:", `${dateRange.start} إلى ${dateRange.end}`],
      [],
      ["البند", "القيمة (₪)"],
      ["إجمالي المبيعات", Math.round(stats.displayGrossSales)],
      ["صافي المبيعات", Math.round(stats.displayNetSales)],
      ["إجمالي الربح", Math.round(stats.displayGrossProfit)],
      ["صافي الربح النهائي", Math.round(stats.displayNetProfit)]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "الملخص العام");
    XLSX.writeFile(wb, `Flyyti_Report_${dateRange.start}.xlsx`);
    showToast("تم تصدير التقرير");
  };

  const handleDownloadTemplate = () => {
    const headers = showImportModal === 'products' 
      ? [["تاريخ المبيعة", "الباركود", "الكمية", "سعر البيع"]]
      : [["التاريخ", "اسم الخدمة", "نوع الخدمة", "التكلفه", "البيع"]];
    
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Flyyti_Import_${showImportModal}_Template.xlsx`);
  };

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const StatCard = ({ title, mainVal, subVal, subLabel, icon: Icon, color, isNegative = false }: any) => (
    <div className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm border-r-8 ${color} flex flex-col justify-between min-h-[160px] transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <div className={`p-4 rounded-2xl ${color.replace('border-r-', 'bg-').replace('-500', '-50')} ${color.replace('border-r-', 'text-')}`}>
          <Icon size={24} />
        </div>
        <div className="text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
          <p className={`text-2xl sm:text-3xl font-black ${isNegative && mainVal < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {Math.round(mainVal)} <span className="text-sm font-bold">₪</span>
          </p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
         <span className="text-[10px] font-bold text-slate-400 uppercase">{subLabel}</span>
         <span className="text-sm font-black text-slate-700">{typeof subVal === 'number' ? Math.round(subVal) + ' ₪' : subVal}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 space-y-6 overflow-y-auto custom-scrollbar font-['Tajawal'] pb-20" dir="rtl">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-10 duration-300 border ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
          <CheckCircle2 size={24} />
          <span className="font-black text-sm">{toast.message}</span>
        </div>
      )}
      
      {/* Header Card */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5 shrink-0">
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-4 bg-emerald-600 rounded-2xl shadow-xl text-white"><PieChart size={28} /></div>
          <div><h2 className="text-2xl font-black text-white tracking-tight">التقارير والذكاء المالي</h2><p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Flyyti Business Intelligence</p></div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto relative z-10">
          <button onClick={() => setShowImportModal('products')} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-lg transition-all font-black text-[11px] w-full sm:w-auto"><Package size={18} /><span>استيراد أصناف</span></button>
          <button onClick={() => setShowImportModal('services')} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl shadow-lg transition-all font-black text-[11px] w-full sm:w-auto"><Zap size={18} /><span>استيراد خدمات</span></button>
          <button onClick={handleExportExcel} className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-2xl shadow-lg transition-all font-black text-[11px] w-full sm:w-auto"><FileDown size={18} /><span>تصدير Excel</span></button>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {(['day', 'month', 'year', 'custom'] as const).map((p) => (
              <button key={p} onClick={() => handlePeriodChange(p)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${period === p ? 'bg-white text-[#0f172a] shadow-lg' : 'text-slate-400 hover:text-white'}`}>{p === 'day' ? 'اليوم' : p === 'month' ? 'الشهر' : p === 'year' ? 'السنة' : 'مخصص'}</button>
            ))}
          </div>
        </div>
      </div>

      {period === 'custom' && (
        <div className="bg-white border-2 border-emerald-100 p-6 rounded-[2.5rem] shadow-xl animate-in slide-in-from-top-4 duration-500 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">من تاريخ</label><input dir="ltr" type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-600 font-black text-lg text-center" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} /></div>
            <div className="space-y-3"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">إلى تاريخ</label><input dir="ltr" type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-600 font-black text-lg text-center" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} /></div>
          </div>
        </div>
      )}

      {/* Finance Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="إجمالي المبيعات" mainVal={stats.displayGrossSales} subVal={stats.displayNetSales} subLabel="صافي المبيعات (بعد المصاريف)" icon={TrendingUp} color="border-r-emerald-500" isNegative={true} />
        <StatCard title="مجموع الجملة" mainVal={stats.displayGrossCost} subVal={stats.displayNetCost} subLabel="صافي التكلفة (خصم المشتريات)" icon={Scale} color="border-r-amber-500" />
        <StatCard title="الربح الإجمالي" mainVal={stats.displayGrossProfit} subVal={stats.displayNetProfit} subLabel="صافي الربح النهائي" icon={Target} color="border-r-blue-500" />
        <StatCard title="إجمالي القطع المباعة" mainVal={stats.itemsSold} subVal={stats.invoiceCount + " فاتورة"} subLabel="عدد الفواتير الصادرة" icon={Package} color="border-r-indigo-500" />
        <StatCard title="إجمالي الخصم" mainVal={stats.totalDiscount} subVal={stats.discountPercentage.toFixed(1) + "%"} subLabel="نسبة الخصم الإجمالية" icon={Receipt} color="border-r-rose-500" />
        <StatCard title="إجمالي المصاريف" mainVal={stats.totalExpenses} subVal={stats.totalPurchases} subLabel="إجمالي المشتريات" icon={Wallet} color="border-r-cyan-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Items Table */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col h-fit">
          <button onClick={() => toggleSection('topItems')} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><Trophy size={22} /></div>
              <div className="text-right"><h3 className="font-black text-slate-900 text-lg">الأصناف الأكثر مبيعاً</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top Selling Items</p></div>
            </div>
            {openSections.topItems ? <ChevronUp size={24} className="text-slate-300" /> : <ChevronDown size={24} className="text-slate-300" />}
          </button>
          {openSections.topItems && (
            <div className="p-6 pt-0 overflow-x-auto custom-scrollbar animate-in slide-in-from-top-2">
              <table className="w-full text-right border-collapse mt-4">
                <thead><tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="p-4 rounded-r-xl">الصنف</th><th className="p-4 text-center">الكمية</th><th className="p-4 text-center">المبيعات</th><th className="p-4 text-left rounded-l-xl text-emerald-600">الربح</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.topItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4"><p className="font-black text-slate-900 text-sm">{item.name}</p><span className="text-[10px] text-slate-400 font-bold">{item.variant}</span></td>
                      <td className="p-4 text-center font-black text-blue-600">x{item.qty}</td>
                      <td className="p-4 text-center font-black text-slate-900">{Math.round(item.total)} ₪</td>
                      <td className="p-4 text-left font-black text-emerald-600">+{Math.round(item.profit)} ₪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Service Type Stats */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col h-fit">
          <button onClick={() => toggleSection('topServices')} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Zap size={22} /></div>
              <div className="text-right"><h3 className="font-black text-slate-900 text-lg">مجموع الخدمات حسب النوع</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Distribution</p></div>
            </div>
            {openSections.topServices ? <ChevronUp size={24} className="text-slate-300" /> : <ChevronDown size={24} className="text-slate-300" />}
          </button>
          {openSections.topServices && (
            <div className="p-6 pt-0 overflow-x-auto custom-scrollbar animate-in slide-in-from-top-2">
              <table className="w-full text-right border-collapse mt-4">
                <thead><tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="p-4 rounded-r-xl">النوع</th><th className="p-4 text-center">العمليات</th><th className="p-4 text-center">المبيعات</th><th className="p-4 text-left rounded-l-xl text-blue-600">الربح</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.serviceTypeStats.map((type, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${type.name === 'صيانة' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}><type.icon size={16} /></div><span className="font-black text-slate-900 text-sm">{type.name}</span></div></td>
                      <td className="p-4 text-center font-black text-blue-600">x{type.qty}</td>
                      <td className="p-4 text-center font-black text-slate-900">{Math.round(type.total)} ₪</td>
                      <td className="p-4 text-left font-black text-blue-600">+{Math.round(type.profit)} ₪</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Service History */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col xl:col-span-2">
          <button onClick={() => toggleSection('detailedServices')} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-600 text-white rounded-2xl"><Clock size={22} /></div>
              <div className="text-right"><h3 className="font-black text-slate-900 text-lg">سجل الخدمات التفصيلي</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detailed Service Transaction History</p></div>
            </div>
            {openSections.detailedServices ? <ChevronUp size={24} className="text-slate-300" /> : <ChevronDown size={24} className="text-slate-300" />}
          </button>
          {openSections.detailedServices && (
            <div className="p-6 pt-0 overflow-x-auto custom-scrollbar animate-in slide-in-from-top-2">
              <table className="w-full text-right border-collapse mt-4">
                <thead><tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="p-4 rounded-r-xl">التاريخ</th><th className="p-4">اسم الخدمة</th><th className="p-4 text-center">نوع الخدمة</th><th className="p-4 text-center">التكلفة</th><th className="p-4 text-left rounded-l-xl">سعر البيع</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.detailedServicesList.map((ser, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-500 text-xs">{ser.date}</td>
                      <td className="p-4 font-black text-slate-900 text-sm">{ser.name}</td>
                      <td className="p-4 text-center"><span className={`px-3 py-1 rounded-lg text-[10px] font-black ${ser.type === 'صيانة' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{ser.type}</span></td>
                      <td className="p-4 text-center font-bold text-slate-400">{Math.round(ser.cost)} ₪</td>
                      <td className="p-4 text-left font-black text-emerald-600">{Math.round(ser.sale)} ₪</td>
                    </tr>
                  ))}
                  {stats.detailedServicesList.length === 0 && (
                    <tr><td colSpan={5} className="p-10 text-center text-slate-300 font-black italic">لا توجد سجلات خدمات متوفرة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Daily Summary */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col xl:col-span-2">
          <button onClick={() => toggleSection('dailyPerformance')} className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-900 text-white rounded-2xl"><History size={22} /></div>
              <div className="text-right"><h3 className="font-black text-slate-900 text-lg">سجل الأداء اليومي المفصل</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily Sales & Performance Logs</p></div>
            </div>
            {openSections.dailyPerformance ? <ChevronUp size={24} className="text-slate-300" /> : <ChevronDown size={24} className="text-slate-300" />}
          </button>
          {openSections.dailyPerformance && (
            <div className="p-6 pt-0 overflow-x-auto custom-scrollbar animate-in slide-in-from-top-2">
              <table className="w-full text-right border-collapse mt-4 min-w-[600px]">
                <thead><tr className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest"><th className="p-5 rounded-r-2xl text-white">التاريخ</th><th className="p-5 text-center text-white">عدد الفواتير</th><th className="p-5 text-center text-white">إجمالي المبيعات (اليومية)</th><th className="p-5 text-left rounded-l-2xl text-emerald-400">الربح الإجمالي</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.dailySummary.map((day, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-all group">
                      <td className="p-5 font-black text-slate-900 text-sm border-r-4 border-emerald-500/0 group-hover:border-emerald-500">{day.date}</td>
                      <td className="p-5 text-center"><span className="px-4 py-1.5 bg-slate-100 rounded-xl font-black text-slate-600 text-xs">{day.count} فاتورة</span></td>
                      <td className="p-5 text-center font-black text-slate-900 text-lg">{Math.round(day.sales)} ₪</td>
                      <td className="p-5 text-left"><div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-1.5 rounded-xl font-black text-emerald-600">+{Math.round(day.profit)} ₪ <ArrowUpCircle size={14} /></div></td>
                    </tr>
                  ))}
                  {stats.dailySummary.length === 0 && (
                    <tr><td colSpan={4} className="p-20 text-center text-slate-300 font-black italic">لا توجد سجلات مبيعات للفترة المحددة</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Unified Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[220] p-4">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in duration-200">
              <div className={`p-8 ${showImportModal === 'products' ? 'bg-emerald-600' : 'bg-blue-600'} text-white flex items-center justify-between`}>
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-white/20 rounded-2xl shadow-xl">
                    {showImportModal === 'products' ? <Package size={28} /> : <Zap size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black">{showImportModal === 'products' ? 'استيراد مبيعات الأصناف' : 'استيراد سجل الخدمات'}</h3>
                    <p className="text-xs font-bold opacity-80">{showImportModal === 'products' ? 'سيتم خصم الكميات من المخزن' : 'سيتم إضافتها كخدمات تاريخية'}</p>
                  </div>
                </div>
                <button onClick={() => setShowImportModal(null)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleDownloadTemplate} className={`flex-1 py-4 font-black rounded-2xl border-2 flex items-center justify-center gap-2 transition-all shadow-sm ${showImportModal === 'products' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}><FileSpreadsheet size={20} />تحميل القالب</button>
                  <button onClick={() => fileInputRef.current?.click()} className={`flex-1 py-4 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg ${showImportModal === 'products' ? 'bg-slate-900 hover:bg-black' : 'bg-slate-900 hover:bg-black'}`}>
                    {importing ? <Loader2 className="animate-spin" size={20}/> : <UploadCloud size={20} />}
                    <span>{importing ? 'جاري الاستيراد...' : 'اختيار الملف'}</span>
                  </button>
                </div>
                <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50 flex flex-col items-center text-center gap-4 group hover:border-emerald-500 transition-all">
                  <FileSpreadsheet size={48} className={`text-slate-300 transition-colors ${showImportModal === 'products' ? 'group-hover:text-emerald-500' : 'group-hover:text-blue-500'}`} />
                  <div>
                    <p className="font-black text-slate-900 text-lg">ارفع ملف الإكسل هنا</p>
                    <p className="text-xs text-slate-400 font-bold mt-1 leading-relaxed">
                      {showImportModal === 'products' 
                        ? 'تاريخ المبيعة، الباركود، الكمية، سعر البيع' 
                        : 'التاريخ، اسم الخدمة، نوع الخدمة، التكلفه، البيع'}
                    </p>
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GeneralReports;
