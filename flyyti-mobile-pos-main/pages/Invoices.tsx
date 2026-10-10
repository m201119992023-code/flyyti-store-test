import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Trash2, 
  Printer, 
  Search, 
  Clock,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../supabase';
import type { AppSettings } from '../types';
import { printThermalReceipt } from '../utils/printThermal';

const Invoices: React.FC<{ settings: AppSettings | null, onUpdateSettings: () => void }> = ({ settings, onUpdateSettings }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('invoices').select(`*, invoice_items (*), extra_services (*)`).order('created_at', { ascending: false });
    if (!error) setInvoices(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const confirmDelete = async () => {
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
      fetchInvoices();
    } catch (error) {
      console.error(error);
      alert("حدث خطأ أثناء الحذف");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-6 space-y-6 overflow-y-auto custom-scrollbar font-['Tajawal']" dir="rtl">
      <div className="flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3"><FileText size={28} />سجل الفواتير</h2>
        <div className="relative"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="text" placeholder="بحث برقم الفاتورة..." className="w-64 pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-slate-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead className="bg-slate-900 text-white"><tr><th className="p-6">رقم الفاتورة / التوقيت</th><th className="p-6 text-center">الإجمالي</th><th className="p-6 text-center">الخصم</th><th className="p-6 text-center">الصافي</th><th className="p-6 text-center">الربح</th><th className="p-6 text-left">الإجراءات</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.filter(i => i.id.toLowerCase().includes(searchTerm.toLowerCase())).map(i => (
                <tr key={i.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-6"><div className="flex flex-col gap-1"><span className="font-mono text-sm font-black text-slate-900">{i.id}</span><div className="flex items-center gap-2 text-slate-400 font-bold text-[10px]"><Clock size={12} />{new Date(i.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div></div></td>
                  <td className="p-6 text-center font-bold text-slate-400">{Math.round(i.total_amount)} ₪</td>
                  <td className="p-6 text-center"><span className={`px-3 py-1 rounded-lg text-[10px] font-black ${Number(i.discount) > 0 ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'text-slate-300'}`}>{Number(i.discount) > 0 ? `-${Math.round(i.discount)} ₪` : '0'}</span></td>
                  <td className="p-6 text-center font-black text-emerald-600 text-lg">{Math.round(i.net_amount)} ₪</td>
                  <td className="p-6 text-center"><div className="inline-flex px-3 py-1 bg-slate-900 text-white rounded-xl text-xs font-black">{Math.round(i.profit)} ₪</div></td>
                  <td className="p-6 text-left"><div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all"><button onClick={() => printThermalReceipt(i)} className="p-3 text-emerald-600 bg-slate-50 rounded-xl"><Printer size={18} /></button><button onClick={() => { setDeleteTargetId(i.id); setShowDeleteConfirm(true); }} className="p-3 text-rose-600 bg-slate-50 rounded-xl"><Trash2 size={18} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[300] p-4"><div className="bg-white rounded-[2rem] shadow-2xl w-full max-sm p-8 text-center animate-in zoom-in duration-200"><AlertTriangle className="mx-auto text-rose-500 mb-4" size={48}/><h3 className="text-xl font-black">حذف الفاتورة</h3><p className="text-slate-500 text-sm mt-2">سيتم إعادة الأصناف للمخزون تلقائياً. هل أنت متأكد؟</p><div className="flex gap-3 mt-6"><button onClick={confirmDelete} className="flex-1 py-4 bg-rose-600 text-white font-black rounded-2xl">تأكيد الحذف</button><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-slate-100 font-black rounded-2xl">إلغاء</button></div></div></div>
      )}
    </div>
  );
};

export default Invoices;