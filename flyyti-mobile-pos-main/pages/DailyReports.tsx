import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Target, 
  ChevronDown, 
  X, 
  FileText, 
  Trash2, 
  Receipt,
  Eye,
  AlertTriangle,
  Loader2,
  Zap,
  LayoutList,
  ChevronUp,
  BarChart3,
  FileDown,
  History,
  Wrench,
  Cog,
  Cpu,
  Edit2,
  Plus,
  Minus,
  Search,
  Save
} from 'lucide-react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const DailyReports: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [showFinancials, setShowFinancials] = useState(false);
  const navigate = useNavigate();
  
  const [openSections, setOpenSections] = useState({
    sales: true,
    services: true,
    invoices: false
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  
  // حالات تعديل الفاتورة
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [month] = useState(new Date().getMonth());
  const [year] = useState(new Date().getFullYear());
  
  const [data, setData] = useState({
    totalSales: 0,
    totalCost: 0,
    totalProfit: 0,
    itemsCount: 0,
    discounts: 0,
    invoices: [] as any[],
    expenses: [] as any[],
    purchases: [] as any[]
  });

  const [loading, setLoading] = useState(true);

  const fetchDailyData = async (day: number) => {
    setLoading(true);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const start = new Date(year, month, day, 0, 0, 0).toISOString();
    const end = new Date(year, month, day, 23, 59, 59).toISOString();

    const { data: invoices } = await supabase
      .from('invoices')
      .select(`*, invoice_items (*), extra_services (*)`)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('date', dateStr);

    const { data: purchases } = await supabase
      .from('purchases')
      .select('*')
      .eq('date', dateStr);

    if (invoices) {
      calculateTotals(invoices, expenses || [], purchases || []);
    }
    setLoading(false);
  };

  const calculateTotals = (invoices: any[], expenses: any[], purchases: any[]) => {
    let productSales = 0, productCost = 0, extraServiceProfit = 0, totalDiscounts = 0, itemsCount = 0;
    invoices.forEach(inv => {
      totalDiscounts += Number(inv.discount);
      inv.invoice_items.forEach((item: any) => { 
        itemsCount += item.quantity; 
        productSales += (item.sale_price * item.quantity); 
        productCost += (item.cost_price * item.quantity); 
      });
      inv.extra_services.forEach((ser: any) => { 
        itemsCount += ser.quantity; 
        extraServiceProfit += (ser.sale_price - ser.cost_price) * ser.quantity; 
      });
    });
    const totalSales = (productSales - totalDiscounts) + extraServiceProfit;
    const totalProfit = (productSales - productCost - totalDiscounts) + extraServiceProfit;
    setData({ totalSales, totalCost: productCost, totalProfit, itemsCount, discounts: totalDiscounts, invoices, expenses, purchases });
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*, variants(*)');
    setAllProducts(data || []);
  };

  useEffect(() => { 
    fetchDailyData(selectedDay); 
    fetchProducts();
  }, [selectedDay]);

  const aggregatedStats = useMemo(() => {
    const itemsMap: Record<string, any> = {};
    const servicesMap: Record<string, any> = {};
    const serviceTypeCounts: Record<string, number> = {
      'صيانة': 0,
      'خدمة': 0,
      'أجهزة': 0
    };

    data.invoices.forEach(inv => {
      // حساب نسبة الخصم لهذه الفاتورة لتوزيعها على الأصناف
      const invDiscRatio = inv.total_amount > 0 ? (inv.discount / inv.total_amount) : 0;

      inv.invoice_items.forEach((it: any) => {
        const key = `${it.product_name}-${it.variant_name}`;
        if (!itemsMap[key]) {
          itemsMap[key] = { name: it.product_name, variant: it.variant_name, qty: 0, cost: 0, sale: 0 };
        }
        
        const lineGrossSale = it.sale_price * it.quantity;
        const lineNetSale = lineGrossSale * (1 - invDiscRatio); // السعر بعد الخصم
        const lineCost = it.cost_price * it.quantity;

        itemsMap[key].qty += it.quantity;
        itemsMap[key].cost += lineCost;
        itemsMap[key].sale += lineNetSale;
      });

      inv.extra_services.forEach((ser: any) => {
        const key = ser.name;
        if (!servicesMap[key]) {
          servicesMap[key] = { name: ser.name, type: ser.service_type, qty: 0, cost: 0, sale: 0 };
        }

        const lineGrossSale = ser.sale_price * ser.quantity;
        const lineNetSale = lineGrossSale * (1 - invDiscRatio); // السعر بعد الخصم
        const lineCost = ser.cost_price * ser.quantity;

        servicesMap[key].qty += ser.quantity;
        servicesMap[key].cost += lineCost;
        servicesMap[key].sale += lineNetSale;

        const type = ser.service_type || 'خدمة';
        if (serviceTypeCounts.hasOwnProperty(type)) {
          serviceTypeCounts[type] += ser.quantity;
        } else {
          serviceTypeCounts['خدمة'] += ser.quantity;
        }
      });
    });

    return {
      products: Object.values(itemsMap).sort((a, b) => b.qty - a.qty),
      services: Object.values(servicesMap).sort((a, b) => b.qty - a.qty),
      serviceTypeCounts
    };
  }, [data.invoices]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDeleteInvoice = async () => {
    if (!deleteTargetId) return;
    setLoading(true);
    try {
      const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', deleteTargetId);
      if (items) {
        for (const item of items) {
          if (item.variant_id) {
            const { data: v } = await supabase.from('variants').select('stock_quantity').eq('id', item.variant_id).single();
            if (v) await supabase.from('variants').update({ stock_quantity: v.stock_quantity + item.quantity }).eq('id', item.variant_id);
          }
        }
      }
      await supabase.from('invoices').delete().eq('id', deleteTargetId);
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
      fetchDailyData(selectedDay);
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحذف");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const productRows = aggregatedStats.products.map(p => ({
      'اسم الصنف': p.name,
      'النوع': p.variant,
      'الكمية': p.qty,
      'إجمالي التكلفة': Math.round(p.cost),
      'إجمالي البيع': Math.round(p.sale),
      'الربح': Math.round(p.sale - p.cost)
    }));
    const summaryRows = [
      {},
      { 'اسم الصنف': '--- الملخص المالي لليوم ---' },
      { 'اسم الصنف': 'إجمالي المبيعات', 'النوع': Math.round(data.totalSales) + ' ₪' },
      { 'اسم الصنف': 'إجمالي التكاليف', 'النوع': Math.round(data.totalCost) + ' ₪' },
      { 'اسم الصنف': 'الربح اليومي', 'النوع': Math.round(data.totalProfit) + ' ₪' },
      { 'اسم الصنف': 'قيمة الخصم', 'النوع': Math.round(data.discounts) + ' ₪' },
      { 'اسم الصنف': 'عدد القطع المباعة', 'النوع': data.itemsCount }
    ];
    const finalData = [...productRows, ...summaryRows];
    const ws = XLSX.utils.json_to_sheet(finalData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تقرير الجرد");
    XLSX.writeFile(wb, `Flyyti_Daily_Report_${selectedDay}_${month + 1}.xlsx`);
  };

  // وظائف تعديل الفاتورة
  const startEditInvoice = (inv: any) => {
    setEditingInvoice(JSON.parse(JSON.stringify(inv))); // نسخة عميقة
    setItemSearchTerm('');
  };

  const updateItemQty = (idx: number, type: 'items' | 'services', delta: number) => {
    const inv = { ...editingInvoice };
    const list = type === 'items' ? inv.invoice_items : inv.extra_services;
    const newQty = Math.max(1, (list[idx].quantity || 0) + delta);
    list[idx].quantity = newQty;
    setEditingInvoice(inv);
  };

  const deleteFromEdit = (idx: number, type: 'items' | 'services') => {
    const inv = { ...editingInvoice };
    if (type === 'items') inv.invoice_items.splice(idx, 1);
    else inv.extra_services.splice(idx, 1);
    setEditingInvoice(inv);
  };

  const addNewItemToEdit = (variant: any, product: any) => {
    const inv = { ...editingInvoice };
    const existing = inv.invoice_items.find((it: any) => it.variant_id === variant.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      inv.invoice_items.push({
        variant_id: variant.id,
        product_name: product.name,
        variant_name: variant.name,
        quantity: 1,
        cost_price: variant.cost_price,
        sale_price: variant.sale_price
      });
    }
    setEditingInvoice(inv);
    setItemSearchTerm('');
  };

  const saveInvoiceEdits = async () => {
    if (isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      // 1. استرجاع الفاتورة الأصلية من قاعدة البيانات لإعادة ضبط المخزون
      const { data: original } = await supabase.from('invoices').select('*, invoice_items(*)').eq('id', editingInvoice.id).single();
      
      if (original) {
        for (const item of original.invoice_items) {
          if (item.variant_id) {
            const { data: v } = await supabase.from('variants').select('stock_quantity').eq('id', item.variant_id).single();
            if (v) await supabase.from('variants').update({ stock_quantity: v.stock_quantity + item.quantity }).eq('id', item.variant_id);
          }
        }
      }

      // 2. حساب القيم الجديدة للفاتورة
      const subtotal = [
        ...editingInvoice.invoice_items.map((i: any) => i.sale_price * i.quantity),
        ...editingInvoice.extra_services.map((s: any) => s.sale_price * s.quantity)
      ].reduce((a, b) => a + b, 0);

      const totalCost = [
        ...editingInvoice.invoice_items.map((i: any) => i.cost_price * i.quantity),
        ...editingInvoice.extra_services.map((s: any) => s.cost_price * s.quantity)
      ].reduce((a, b) => a + b, 0);

      const discount = Number(editingInvoice.discount) || 0;
      const netAmount = Math.max(0, subtotal - discount);

      // 3. تحديث الفاتورة
      await supabase.from('invoices').update({
        total_amount: subtotal,
        discount: discount,
        net_amount: netAmount,
        total_cost: totalCost,
        profit: netAmount - totalCost
      }).eq('id', editingInvoice.id);

      // 4. حذف الأصناف القديمة وإضافة الجديدة
      await supabase.from('invoice_items').delete().eq('invoice_id', editingInvoice.id);
      await supabase.from('extra_services').delete().eq('invoice_id', editingInvoice.id);

      if (editingInvoice.invoice_items.length > 0) {
        await supabase.from('invoice_items').insert(editingInvoice.invoice_items.map((it: any) => ({
          invoice_id: editingInvoice.id,
          variant_id: it.variant_id,
          product_name: it.product_name,
          variant_name: it.variant_name,
          quantity: it.quantity,
          cost_price: it.cost_price,
          sale_price: it.sale_price
        })));

        // خصم المخزون الجديد
        for (const item of editingInvoice.invoice_items) {
          if (item.variant_id) {
            const { data: v } = await supabase.from('variants').select('stock_quantity').eq('id', item.variant_id).single();
            if (v) await supabase.from('variants').update({ stock_quantity: v.stock_quantity - item.quantity }).eq('id', item.variant_id);
          }
        }
      }

      if (editingInvoice.extra_services.length > 0) {
        await supabase.from('extra_services').insert(editingInvoice.extra_services.map((ser: any) => ({
          invoice_id: editingInvoice.id,
          name: ser.name,
          service_type: ser.service_type || 'خدمة',
          cost_price: ser.cost_price,
          sale_price: ser.sale_price,
          quantity: ser.quantity
        })));
      }

      setEditingInvoice(null);
      fetchDailyData(selectedDay);
      fetchProducts();
      alert("تم تحديث الفاتورة والمخزون بنجاح");
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const daysInMonth = new Array(new Date(year, month + 1, 0).getDate()).fill(0).map((_, i) => i + 1);
  const monthName = new Date(year, month).toLocaleDateString('ar-EG', { month: 'long' });

  // تصفية المنتجات للبحث أثناء التعديل
  const filteredProductsToEdit = useMemo(() => {
    if (!itemSearchTerm) return [];
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) || 
      p.variants?.some((v: any) => v.barcode?.includes(itemSearchTerm))
    ).slice(0, 5);
  }, [allProducts, itemSearchTerm]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-4 space-y-4 overflow-y-auto custom-scrollbar font-['Tajawal']" dir="rtl">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
        <h2 className="text-xl font-black text-[#0f172a] flex items-center gap-2">
          <BarChart3 className="text-emerald-600" size={24} />
          التقارير اليومية والجرد
        </h2>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button onClick={() => navigate('/reports')} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg font-black text-xs hover:bg-black transition-all">
            <History size={16} className="text-emerald-500" />
            <span>تاريخ المبيعات</span>
          </button>
          <button onClick={handleExportExcel} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg font-black text-xs hover:bg-emerald-700 transition-all">
            <FileDown size={16} />
            <span>تصدير التقرير</span>
          </button>
          <div className="relative flex-1 sm:flex-none">
            <button onClick={() => setShowDayPicker(!showDayPicker)} className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-[#0f172a] px-4 py-2.5 rounded-xl shadow-sm font-black text-xs transition-all">
              <Calendar size={16} className="text-emerald-600" />
              <span>{selectedDay} {monthName}</span>
              <ChevronDown size={14} className={`transition-transform ${showDayPicker ? 'rotate-180' : ''}`} />
            </button>
            {showDayPicker && (
              <>
                <div className="fixed inset-0 z-[110]" onClick={() => setShowDayPicker(false)} />
                <div className="absolute top-12 left-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-[111] animate-in zoom-in duration-200">
                  <div className="grid grid-cols-7 gap-1">
                    {daysInMonth.map(day => (
                      <button key={day} onClick={() => { setSelectedDay(day); setShowDayPicker(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${selectedDay === day ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-600'}`}>{day}</button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative shrink-0">
        <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 transition-all duration-500 ${!showFinancials ? 'blur-md grayscale opacity-40 select-none pointer-events-none' : ''}`}>
          {[
            { label: 'المبيعات', value: data.totalSales, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'التكاليف', value: data.totalCost, icon: DollarSign, color: 'text-slate-500', bg: 'bg-slate-50' },
            { label: 'الربح اليومي', value: data.totalProfit, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'القطع', value: data.itemsCount, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'الخصومات', value: data.discounts, icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50' }
          ].map((stat, i) => (
            <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
              <div className={`p-2 rounded-xl w-fit ${stat.bg} ${stat.color}`}><stat.icon size={20} /></div>
              <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p><p className="text-lg font-black text-slate-900">{Math.round(stat.value)} ₪</p></div>
            </div>
          ))}
        </div>
        {!showFinancials && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <button onClick={() => setShowFinancials(true)} className="flex items-center gap-3 bg-[#0f172a] text-white px-8 py-4 rounded-2xl shadow-2xl hover:bg-slate-800 transition-all active:scale-95 group">
              <Eye size={22} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="font-black text-sm uppercase tracking-[0.1em]">كشف الميزانية اليومية</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4 pb-10">
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <button onClick={() => toggleSection('sales')} className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm"><LayoutList size={22} /></div>
              <div className="text-right">
                <h3 className="font-black text-slate-900 text-base">جرد الأصناف المباعة</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Sold Products</p>
              </div>
            </div>
            {openSections.sales ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
          </button>
          {openSections.sales && (
            <div className="p-5 pt-0 border-t border-slate-50 animate-in slide-in-from-top-2">
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-4 rounded-r-xl">الصنف / النوع</th>
                      <th className="p-4 text-center">الكمية</th>
                      <th className="p-4 text-center">إجمالي التكلفة</th>
                      <th className="p-4 text-center">إجمالي البيع (الصافي)</th>
                      <th className="p-4 text-left rounded-l-xl text-emerald-600">صافي الربح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aggregatedStats.products.map((p, i) => (
                      <tr key={i} className="text-sm hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <span className="block font-black text-slate-900">{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">{p.variant}</span>
                        </td>
                        <td className="p-4 text-center font-black text-blue-600 text-base">x{p.qty}</td>
                        <td className="p-4 text-center text-slate-400 font-bold">{Math.round(p.cost)} ₪</td>
                        <td className="p-4 text-center font-black text-slate-900">{Math.round(p.sale)} ₪</td>
                        <td className="p-4 text-left font-black text-emerald-600">+{Math.round(p.sale - p.cost)} ₪</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <button onClick={() => toggleSection('services')} className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-sm"><Zap size={22} /></div>
              <div className="text-right">
                <h3 className="font-black text-slate-900 text-base">جرد الخدمات المقدمة</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Services Log</p>
              </div>
            </div>
            {openSections.services ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
          </button>
          {openSections.services && (
            <div className="p-5 pt-0 border-t border-slate-50 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-3 gap-3 mt-5 mb-6">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm">
                  <Wrench size={20} className="text-emerald-600" />
                  <span className="text-[10px] font-black text-emerald-700 uppercase">الصيانة</span>
                  <span className="text-xl font-black text-emerald-900">{aggregatedStats.serviceTypeCounts['صيانة']}</span>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm">
                  <Cog size={20} className="text-blue-600" />
                  <span className="text-[10px] font-black text-blue-700 uppercase">خدمة سريعة</span>
                  <span className="text-xl font-black text-blue-900">{aggregatedStats.serviceTypeCounts['خدمة']}</span>
                </div>
                <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-sm">
                  <Cpu size={20} className="text-slate-600" />
                  <span className="text-[10px] font-black text-slate-700 uppercase">الأجهزة</span>
                  <span className="text-xl font-black text-emerald-900">{aggregatedStats.serviceTypeCounts['أجهزة']}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="p-4 rounded-r-xl">اسم الخدمة</th>
                      <th className="p-4 text-center">الكمية</th>
                      <th className="p-4 text-center">إجمالي التكلفة</th>
                      <th className="p-4 text-center">إجمالي البيع (الصافي)</th>
                      <th className="p-4 text-left rounded-l-xl text-blue-600">الربح الصافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aggregatedStats.services.map((s, i) => (
                      <tr key={i} className="text-sm hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-black text-slate-900">{s.name} <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 rounded">[{s.type}]</span></td>
                        <td className="p-4 text-center font-black text-blue-600 text-base">x{s.qty}</td>
                        <td className="p-4 text-center text-slate-400 font-bold">{Math.round(s.cost)} ₪</td>
                        <td className="p-4 text-center font-black text-slate-900">{Math.round(s.sale)} ₪</td>
                        <td className="p-4 text-left font-black text-blue-600">+{Math.round(s.sale - s.cost)} ₪</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
          <button onClick={() => toggleSection('invoices')} className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-sm"><Receipt size={22} /></div>
              <div className="text-right">
                <h3 className="font-black text-slate-900 text-base">سجل الفواتير الصادرة</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Individual Transaction Logs</p>
              </div>
            </div>
            {openSections.invoices ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
          </button>
          {openSections.invoices && (
            <div className="p-5 pt-0 border-t border-slate-50 space-y-3 animate-in slide-in-from-top-2">
              <div className="mt-4 space-y-3">
                {data.invoices.map((inv) => (
                  <div key={inv.id} className="bg-slate-50/50 border border-slate-200 rounded-2xl overflow-hidden flex flex-col transition-all">
                    <div className="p-4 flex items-center justify-between group">
                      <button onClick={() => setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id)} className="flex items-center gap-4 flex-1 text-right">
                        <div className={`p-2.5 rounded-xl transition-all ${expandedInvoiceId === inv.id ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm'}`}><FileText size={20} /></div>
                        <div>
                          <p className="font-mono text-[10px] font-black text-slate-400 tracking-tight">#{inv.id}</p>
                          <p className="font-black text-xs text-slate-900">{new Date(inv.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-5">
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-300 line-through decoration-slate-400">{Math.round(inv.total_amount)} ₪</p>
                          <p className="font-black text-emerald-600 text-base">{Math.round(inv.net_amount)} ₪</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => startEditInvoice(inv)} className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                          <button onClick={() => { setDeleteTargetId(inv.id); setShowDeleteConfirm(true); }} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                        </div>
                        <ChevronDown size={20} className={`text-slate-300 transition-transform ${expandedInvoiceId === inv.id ? 'rotate-180 text-emerald-600' : ''}`} />
                      </div>
                    </div>
                    {expandedInvoiceId === inv.id && (
                      <div className="p-5 bg-white border-t border-slate-100 animate-in slide-in-from-top-1">
                        <div className="flex justify-between items-center text-[11px] mb-5 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2"><Target size={14} className="text-emerald-600"/><span className="text-emerald-800 font-black">صافي الربح لهذه الفاتورة:</span></div>
                          <span className="text-emerald-700 font-black text-base">{Math.round(inv.profit)} ₪</span>
                        </div>
                        <table className="w-full text-right text-[11px]">
                           <thead><tr className="text-slate-400 font-black uppercase tracking-widest border-b border-slate-50"><th>البيان</th><th className="text-center pb-2">الكمية</th><th className="text-left pb-2">المجموع</th></tr></thead>
                           <tbody className="divide-y divide-slate-50">
                              {inv.invoice_items.map((it: any) => (
                                <tr key={it.id} className="text-slate-700"><td className="py-3 font-bold">{it.product_name} <span className="text-slate-400 font-medium text-[9px] block">({it.variant_name})</span></td><td className="text-center font-black text-slate-900">x{it.quantity}</td><td className="text-left font-black text-slate-900">{Math.round(it.sale_price * it.quantity)} ₪</td></tr>
                              ))}
                              {inv.extra_services.map((ser: any) => (
                                <tr key={ser.id} className="text-blue-600"><td className="py-3 font-bold flex items-center gap-1"><Zap size={10}/> {ser.name} ({ser.service_type})</td><td className="text-center font-black">x{ser.quantity}</td><td className="text-left font-black">{Math.round(ser.sale_price * ser.quantity)} ₪</td></tr>
                              ))}
                           </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نافذة تعديل الفاتورة */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[250] p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl"><Edit2 size={24} /></div>
                  <h3 className="text-xl font-black">تعديل الفاتورة #{editingInvoice.id}</h3>
               </div>
               <button onClick={() => setEditingInvoice(null)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
              {/* قسم البحث لإضافة صنف جديد */}
              <div className="space-y-3">
                 <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">إضافة صنف جديد للفاتورة</label>
                 <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="ابحث بالاسم أو الباركود لإضافة قطع..." 
                      className="w-full pr-12 pl-4 py-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold shadow-sm"
                      value={itemSearchTerm}
                      onChange={(e) => setItemSearchTerm(e.target.value)}
                    />
                    {filteredProductsToEdit.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 mt-2 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100">
                         {filteredProductsToEdit.map((p: any) => (
                            <div key={p.id} className="p-3">
                               <p className="text-[10px] font-black text-slate-400 mb-2">{p.name}</p>
                               <div className="flex flex-wrap gap-2">
                                  {p.variants.map((v: any) => (
                                     <button 
                                      key={v.id} 
                                      onClick={() => addNewItemToEdit(v, p)}
                                      className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                                     >
                                      {v.name} - {Math.round(v.sale_price)} ₪
                                     </button>
                                  ))}
                               </div>
                            </div>
                         ))}
                      </div>
                    )}
                 </div>
              </div>

              {/* قائمة الأصناف الحالية */}
              <div className="space-y-4">
                 <h4 className="font-black text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2"><Package size={18}/> محتويات الفاتورة</h4>
                 <div className="space-y-3">
                    {editingInvoice.invoice_items.map((it: any, idx: number) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                         <div className="text-right">
                            <p className="font-black text-slate-900 text-sm">{it.product_name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{it.variant_name}</p>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                               <button onClick={() => updateItemQty(idx, 'items', 1)} className="p-2 bg-white rounded-lg text-blue-600 shadow-sm active:scale-90"><Plus size={14}/></button>
                               <span className="w-8 text-center font-black text-sm">{it.quantity}</span>
                               <button onClick={() => updateItemQty(idx, 'items', -1)} className="p-2 bg-white rounded-lg text-rose-600 shadow-sm active:scale-90"><Minus size={14}/></button>
                            </div>
                            <div className="w-20 text-left font-black text-blue-600">{Math.round(it.sale_price * it.quantity)} ₪</div>
                            <button onClick={() => deleteFromEdit(idx, 'items')} className="p-2 text-rose-400 hover:text-rose-600"><Trash2 size={18}/></button>
                         </div>
                      </div>
                    ))}
                    {editingInvoice.extra_services.map((ser: any, idx: number) => (
                      <div key={`ser-${idx}`} className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between shadow-sm">
                         <div className="text-right">
                            <p className="font-black text-blue-900 text-sm">{ser.name}</p>
                            <p className="text-[10px] font-bold text-blue-400">{ser.service_type || 'خدمة'}</p>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white/50 p-1 rounded-xl">
                               <button onClick={() => updateItemQty(idx, 'services', 1)} className="p-2 bg-white rounded-lg text-blue-600 shadow-sm active:scale-90"><Plus size={14}/></button>
                               <span className="w-8 text-center font-black text-sm">{ser.quantity}</span>
                               <button onClick={() => updateItemQty(idx, 'services', -1)} className="p-2 bg-white rounded-lg text-rose-600 shadow-sm active:scale-90"><Minus size={14}/></button>
                            </div>
                            <div className="w-20 text-left font-black text-blue-600">{Math.round(ser.sale_price * ser.quantity)} ₪</div>
                            <button onClick={() => deleteFromEdit(idx, 'services')} className="p-2 text-rose-400 hover:text-rose-600"><Trash2 size={18}/></button>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* قسم الخصم والإجماليات */}
              <div className="p-6 bg-slate-900 rounded-[2rem] text-white space-y-4">
                 <div className="flex justify-between items-center">
                    <label className="text-sm font-black opacity-70">تعديل قيمة الخصم (₪):</label>
                    <input 
                      type="number" 
                      className="bg-white/10 border border-white/20 rounded-xl p-3 w-32 font-black text-center text-emerald-400 outline-none focus:bg-white/20"
                      value={editingInvoice.discount}
                      onChange={(e) => setEditingInvoice({...editingInvoice, discount: e.target.value})}
                    />
                 </div>
                 <div className="border-t border-white/10 pt-4 flex justify-between items-baseline">
                    <span className="text-sm font-bold opacity-60">الصافي النهائي للفاتورة:</span>
                    <div className="flex items-baseline gap-1">
                       <span className="text-3xl font-black text-emerald-400">
                          {Math.round(
                            [
                              ...editingInvoice.invoice_items.map((i: any) => i.sale_price * i.quantity),
                              ...editingInvoice.extra_services.map((s: any) => s.sale_price * s.quantity)
                            ].reduce((a, b) => a + b, 0) - (Number(editingInvoice.discount) || 0)
                          )}
                       </span>
                       <span className="text-sm">₪</span>
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
               <button 
                onClick={saveInvoiceEdits}
                disabled={isSavingEdit}
                className="flex-1 py-5 bg-emerald-600 text-white font-black text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
               >
                 {isSavingEdit ? <Loader2 className="animate-spin"/> : <Save/>}
                 <span>حفظ الفاتورة وتحديث المخزون</span>
               </button>
               <button onClick={() => setEditingInvoice(null)} className="px-10 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm overflow-hidden p-10 space-y-6 text-center animate-in zoom-in duration-200">
            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner"><AlertTriangle size={50} /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">حذف الفاتورة نهائياً</h3>
              <p className="text-slate-500 text-sm mt-3 font-bold leading-relaxed">عند الحذف، سيتم إعادة الأصناف المباعة إلى رصيد المخزون تلقائياً.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDeleteInvoice} className="flex-1 py-5 bg-rose-600 text-white font-black rounded-2xl shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all">تأكيد الحذف</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReports;
