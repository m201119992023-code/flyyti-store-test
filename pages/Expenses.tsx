import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Wallet, 
  ShoppingCart, 
  Trash2, 
  Calendar, 
  FileText, 
  X, 
  TrendingUp, 
  Edit2, 
  Save, 
  PieChart, 
  Percent,
  PlusCircle,
  Loader2,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  DollarSign,
  Settings,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { supabase } from '../supabase';
import type { AppSettings } from '../types';

interface Props {
  settings: AppSettings | null;
  onUpdateSettings: () => void;
}

const Expenses: React.FC<Props> = ({ settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'purchases'>('expenses');
  const [period, setPeriod] = useState<'day' | 'month' | 'year' | 'custom'>('month');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA');
    return { start, end };
  });

  const [expenses, setExpenses] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [invoicesProfit, setInvoicesProfit] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState<'capital' | 'shares' | null>(null);
  const [tempSettings, setTempSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{id: string, table: string} | null>(null);

  const [form, setForm] = useState({
    type: '',
    amount: 0,
    supplier: '',
    note: '',
    date: new Date().toLocaleDateString('en-CA')
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const start = dateRange.start;
      const end = dateRange.end;
      const startIso = new Date(start + 'T00:00:00Z').toISOString();
      const endIso = new Date(end + 'T23:59:59Z').toISOString();

      // جلب المصاريف في الفترة
      const { data: ex } = await supabase.from('expenses').select('*').gte('date', start).lte('date', end).order('date', { ascending: false });
      
      // جلب المشتريات في الفترة
      const { data: pu } = await supabase.from('purchases').select('*').gte('date', start).lte('date', end).order('date', { ascending: false });
      
      // جلب أرباح الفواتير في الفترة
      const { data: inv } = await supabase.from('invoices').select('profit').gte('created_at', startIso).lte('created_at', endIso);

      setExpenses(ex || []);
      setPurchases(pu || []);
      setInvoicesProfit(inv?.reduce((sum, i) => sum + Number(i.profit), 0) || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (p: typeof period) => {
    setPeriod(p);
    const now = new Date();
    if (p === 'day') {
      const d = now.toLocaleDateString('en-CA');
      setDateRange({ start: d, end: d });
    } else if (p === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA');
      setDateRange({ start, end });
    } else if (p === 'year') {
      const start = new Date(now.getFullYear(), 0, 1).toLocaleDateString('en-CA');
      const end = new Date(now.getFullYear(), 11, 31).toLocaleDateString('en-CA');
      setDateRange({ start, end });
    }
  };

  const handleSave = async () => {
    if (activeTab === 'expenses' && (!form.type || form.amount <= 0)) return;
    if (activeTab === 'purchases' && form.amount <= 0) return;
    
    setSaving(true);
    if (activeTab === 'expenses') {
      await supabase.from('expenses').insert({
        type: form.type,
        amount: form.amount,
        date: form.date,
        note: form.note
      });
    } else {
      await supabase.from('purchases').insert({
        amount: form.amount,
        supplier: form.supplier || 'مورد عام',
        date: form.date,
        note: form.note
      });
    }
    setSaving(false);
    setShowModal(false);
    setForm({ type: '', amount: 0, supplier: '', note: '', date: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  const requestDelete = (id: string, table: string) => {
    setDeleteTarget({ id, table });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from(deleteTarget.table).delete().eq('id', deleteTarget.id);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    fetchData();
  };

  const handleUpdateGlobalSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('settings')
      .update(tempSettings)
      .eq('id', 1);
    
    setSaving(false);
    if (!error) {
      onUpdateSettings();
      setEditMode(null);
    }
  };

  const totalPeriodExpenses = expenses.reduce((s, i) => s + Number(i.amount), 0);
  const totalPeriodPurchases = purchases.reduce((s, i) => s + Number(i.amount), 0);
  
  // صافي الربح للفترة = أرباح الفواتير - المصاريف
  const netProfit = invoicesProfit - totalPeriodExpenses;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-6 space-y-6 overflow-y-auto custom-scrollbar font-['Tajawal'] pb-20" dir="rtl">
      
      {/* 1. Header & Period Filter */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0f172a] p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5 shrink-0">
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-4 bg-emerald-600 rounded-2xl shadow-xl text-white">
            <Wallet size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">الإدارة المالية والمصاريف</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Flyyti Financial Management</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto relative z-10">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {(['day', 'month', 'year', 'custom'] as const).map((p) => (
              <button 
                key={p} 
                onClick={() => handlePeriodChange(p)} 
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${period === p ? 'bg-white text-[#0f172a] shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                {p === 'day' ? 'اليوم' : p === 'month' ? 'الشهر' : p === 'year' ? 'السنة' : 'مخصص'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {period === 'custom' && (
        <div className="bg-white border-2 border-emerald-100 p-6 rounded-[2.5rem] shadow-xl animate-in slide-in-from-top-4 duration-500 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">من تاريخ</label>
              <input dir="ltr" type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-600 font-black text-lg text-center" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
            </div>
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-2">إلى تاريخ</label>
              <input dir="ltr" type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-600 font-black text-lg text-center" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
            </div>
          </div>
        </div>
      )}

      {/* 2. Dashboard Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="flex justify-between items-start relative">
            <div className="flex items-center gap-4">
               <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200"><TrendingUp size={24} /></div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">الوضع المالي للفترة</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Period Financial Status</p>
               </div>
            </div>
            <button 
              onClick={() => { setEditMode('capital'); setTempSettings({ capital: settings?.capital, savings: settings?.savings }); }}
              className="p-3 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-xl transition-all"
            >
              <Edit2 size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mt-10 relative">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">رأس المال</p>
              <p className="text-xl font-black text-slate-900">{Math.round(settings?.capital || 0)} <span className="text-xs">₪</span></p>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">الادخار</p>
              <p className="text-xl font-black text-slate-900">{Math.round(settings?.savings || 0)} <span className="text-xs">₪</span></p>
            </div>
            <div className={`p-5 rounded-2xl border ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>صافي الربح</p>
              <p className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Math.round(netProfit)} <span className="text-xs">₪</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
               <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100"><PieChart size={24} /></div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">توزيع الأرباح والنسب</h3>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Shares Distribution ({period})</p>
               </div>
            </div>
            <button 
              onClick={() => { setEditMode('shares'); setTempSettings({ profit_shares: { ...settings?.profit_shares } }); }}
              className="p-3 text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-xl transition-all"
            >
              <Percent size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
               { label: 'مجاهد', key: 'mujahed', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
               { label: 'عبود', key: 'abboud', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
               { label: 'المحل', key: 'shop', color: 'bg-slate-900 border-slate-900 text-white' },
               { label: 'خاص', key: 'special', color: 'bg-slate-50 border-slate-100 text-slate-600' }
            ].map((share) => {
              const sharePercent = settings?.profit_shares[share.key as keyof typeof settings.profit_shares] || 0;
              // الحصص تحسب بناءً على صافي ربح الفترة
              const shareAmount = Math.max(0, (netProfit * sharePercent) / 100);
              return (
                <div key={share.key} className={`p-4 rounded-2xl border text-center transition-all ${share.color}`}>
                  <p className="text-[10px] font-black uppercase opacity-60 mb-1">{share.label} ({sharePercent}%)</p>
                  <p className="text-lg font-black tracking-tight">{Math.round(shareAmount)} ₪</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Management Table */}
      <div className="flex-1 flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full md:w-auto">
            <button onClick={() => setActiveTab('expenses')} className={`flex-1 md:px-10 py-3 rounded-xl font-black transition-all ${activeTab === 'expenses' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}>سجل المصاريف</button>
            <button onClick={() => setActiveTab('purchases')} className={`flex-1 md:px-10 py-3 rounded-xl font-black transition-all ${activeTab === 'purchases' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}>سجل المشتريات</button>
          </div>
          <button onClick={() => setShowModal(true)} className="w-full md:w-auto px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-emerald-700 active:scale-95 transition-all"><PlusCircle size={20} />إضافة {activeTab === 'expenses' ? 'مصروف جديد' : 'مشتريات جديدة'}</button>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white shrink-0">
             <div className="flex items-center gap-4">
                {activeTab === 'expenses' ? <Wallet className="text-emerald-500" /> : <ShoppingCart className="text-emerald-500" />}
                <h3 className="font-black text-lg">قائمة {activeTab === 'expenses' ? 'المصاريف التشغيلية' : 'المشتريات والتوريدات'} للفترة</h3>
             </div>
             <div className="px-4 py-2 bg-white/10 rounded-xl font-black text-sm">
               إجمالي {activeTab === 'expenses' ? 'المصاريف' : 'المشتريات'}: {Math.round(activeTab === 'expenses' ? totalPeriodExpenses : totalPeriodPurchases)} ₪
             </div>
          </div>
          
          <div className="overflow-x-auto flex-1 custom-scrollbar min-h-[300px]">
            <table className="w-full text-right">
              <thead><tr className="bg-slate-50 border-b border-slate-100"><th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'expenses' ? 'نوع المصروف' : 'المورد'}</th><th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">المبلغ</th><th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">التاريخ</th><th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ملاحظات</th><th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">الإجراءات</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(activeTab === 'expenses' ? expenses : purchases).map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-5"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === 'expenses' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{activeTab === 'expenses' ? <Receipt size={14} /> : <ShoppingCart size={14} />}</div><span className="font-black text-slate-900 text-sm">{activeTab === 'expenses' ? item.type : item.supplier || '-'}</span></div></td>
                    <td className="p-5 text-center"><span className={`px-4 py-1 rounded-full font-black text-sm ${activeTab === 'expenses' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{Math.round(item.amount)} ₪</span></td>
                    <td className="p-5 text-center"><div className="flex items-center justify-center gap-2 text-slate-400 text-[11px] font-bold"><Calendar size={12} />{item.date}</div></td>
                    <td className="p-5"><p className="text-[11px] text-slate-400 italic font-medium max-w-xs truncate">{item.note || 'بدون ملاحظات'}</p></td>
                    <td className="p-5 text-left"><button onClick={() => requestDelete(item.id, activeTab)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button></td>
                  </tr>
                ))}
                {(activeTab === 'expenses' ? expenses : purchases).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-300 font-black italic">لا توجد سجلات في هذه الفترة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 rounded-xl"><Plus size={24} /></div>
                <h3 className="text-xl font-black">{activeTab === 'expenses' ? 'إضافة مصروف' : 'إضافة مشتريات'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{activeTab === 'expenses' ? 'نوع المصروف' : 'المورد'}</label>
                <input 
                  type="text" 
                  className="w-full p-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-slate-900 font-bold"
                  placeholder={activeTab === 'expenses' ? "كهرباء، ماء، صيانة..." : "اسم المورد..."}
                  value={(activeTab === 'expenses' ? form.type : form.supplier) || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, [activeTab === 'expenses' ? 'type' : 'supplier']: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">المبلغ (₪)</label>
                  <input 
                    dir="ltr"
                    type="number" 
                    className="w-full p-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-600 font-black text-xl text-center"
                    value={form.amount || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">التاريخ</label>
                  <input 
                    dir="ltr"
                    type="date" 
                    className="w-full p-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-slate-900 font-bold"
                    value={form.date}
                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">ملاحظات (اختياري)</label>
                <textarea 
                  className="w-full p-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-slate-900 font-bold"
                  rows={2}
                  value={form.note || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-5 bg-emerald-600 text-white font-black text-xl rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                <span>حفظ البيانات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Global Settings Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[210] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-lg overflow-hidden animate-in zoom-in duration-200 border border-slate-100">
            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-xl"><Settings size={24} /></div>
                <h3 className="text-xl font-black">{editMode === 'capital' ? 'تعديل المركز المالي' : 'تعديل نسب توزيع الأرباح'}</h3>
              </div>
              <button onClick={() => setEditMode(null)} className="p-2 bg-white/10 rounded-lg"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-8">
              {editMode === 'capital' ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">رأس المال الحالي</label>
                    <input 
                      dir="ltr"
                      type="number" 
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-black text-2xl text-center"
                      value={tempSettings?.capital || 0}
                      onChange={(e) => setTempSettings({ ...tempSettings, capital: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">مبلغ الادخار</label>
                    <input 
                      dir="ltr"
                      type="number" 
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-black text-2xl text-center"
                      value={tempSettings?.savings || 0}
                      onChange={(e) => setTempSettings({ ...tempSettings, savings: Number(e.target.value) })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {Object.entries(tempSettings?.profit_shares || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {key === 'mujahed' ? 'نسبة مجاهد' : key === 'abboud' ? 'نسبة عبود' : key === 'shop' ? 'نسبة المحل' : 'نسبة خاصة'} (%)
                      </label>
                      <input 
                        dir="ltr"
                        type="number" 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-600 font-black text-xl text-center"
                        value={value || 0}
                        onChange={(e) => setTempSettings({ 
                          ...tempSettings, 
                          profit_shares: { ...tempSettings.profit_shares, [key]: Number(e.target.value) } 
                        })}
                      />
                    </div>
                  ))}
                  <div className="col-span-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-[10px] font-black uppercase text-center">
                    تأكد من أن مجموع النسب يساوي 100%
                  </div>
                </div>
              )}
              <button 
                onClick={handleUpdateGlobalSettings}
                disabled={saving}
                className="w-full py-5 bg-slate-900 text-white font-black text-xl rounded-[1.8rem] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3"
              >
                {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="text-emerald-500" />}
                <span>حفظ التغييرات النهائية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm overflow-hidden p-8 space-y-6 text-center animate-in zoom-in duration-200">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">تأكيد الحذف</h3>
              <p className="text-slate-500 text-sm mt-2 font-bold">هل أنت متأكد من حذف هذا السجل نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg">حذف السجل</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl">تراجع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;