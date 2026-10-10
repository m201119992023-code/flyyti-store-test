
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Tag, 
  ChevronLeft, 
  X, 
  FolderTree, 
  Layers, 
  LayoutGrid,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  CheckSquare,
  Square,
  AlertTriangle,
  PlusCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import type { Category } from '../types';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({ 
    name: '', 
    parent_id: null as string | null 
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      setCategories(data || []);
      
      if (data && data.length > 0 && !selectedMainId) {
        const firstMain = data.find(c => !c.parent_id);
        if (firstMain) setSelectedMainId(firstMain.id);
      }
    } catch (err) {
      console.error(err);
      showToast("خطأ في تحميل الأقسام", "error");
    } finally {
      setLoading(false);
    }
  };

  const mainCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  const subCategories = useMemo(() => categories.filter(c => c.parent_id === selectedMainId), [categories, selectedMainId]);

  const handleOpenAdd = (parentId: string | null = null) => {
    setModalMode('add');
    setEditingId(null);
    setForm({ name: '', parent_id: parentId });
    setShowAddModal(true);
  };

  const handleOpenEdit = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setModalMode('edit');
    setEditingId(cat.id);
    setForm({ name: cat.name, parent_id: cat.parent_id });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!form.name || saving) return;
    setSaving(true);
    try {
      if (modalMode === 'add') {
        const { error } = await supabase.from('categories').insert(form);
        if (error) throw error;
        showToast("تم إضافة القسم بنجاح");
      } else {
        const { error } = await supabase.from('categories').update({ name: form.name, parent_id: form.parent_id }).eq('id', editingId);
        if (error) throw error;
        showToast("تم تحديث البيانات");
      }
      setShowAddModal(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      showToast("فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('categories').insert({
        name: `${cat.name} (نسخة)`,
        parent_id: cat.parent_id
      });
      if (error) throw error;
      showToast("تم تكرار القسم بنجاح");
      fetchCategories();
    } catch (err) {
      console.error(err);
      showToast("خطأ في التكرار", "error");
    }
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      // 1. العثور على جميع الأقسام الفرعية التابعة لهذا القسم
      const { data: subs } = await supabase.from('categories').select('id').eq('parent_id', deleteId);
      const subIds = subs?.map(s => s.id) || [];
      const allCatIds = [deleteId, ...subIds];

      // 2. العثور على جميع المنتجات المرتبطة بهذه الأقسام
      const { data: prods } = await supabase.from('products').select('id').or(`category_id.in.(${allCatIds.join(',')}),sub_category_id.in.(${allCatIds.join(',')})`);
      const prodIds = prods?.map(p => p.id) || [];

      // 3. حذف الأنواع المرتبطة بالمنتجات
      if (prodIds.length > 0) {
        await supabase.from('variants').delete().in('product_id', prodIds);
        // 4. حذف المنتجات
        await supabase.from('products').delete().in('id', prodIds);
      }

      // 5. حذف الأقسام الفرعية
      if (subIds.length > 0) {
        await supabase.from('categories').delete().in('id', subIds);
      }

      // 6. حذف القسم الرئيسي
      const { error } = await supabase.from('categories').delete().eq('id', deleteId);
      
      if (error) throw error;
      showToast("تم حذف القسم وكافة ملحقاته بنجاح");
      if (selectedMainId === deleteId) setSelectedMainId(null);
      setSelectedIds(prev => prev.filter(sid => sid !== deleteId));
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      showToast("فشل الحذف: " + err.message, "error");
    } finally {
      setShowDeleteModal(false);
      setDeleteId(null);
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      for (const id of selectedIds) {
        // نكرر منطق الحذف لكل قسم مختار (بشكل مبسط لتجنب التعقيد الزائد في الاستعلام الجماعي)
        const { data: subs } = await supabase.from('categories').select('id').eq('parent_id', id);
        const subIds = subs?.map(s => s.id) || [];
        const allCatIds = [id, ...subIds];
        
        const { data: prods } = await supabase.from('products').select('id').or(`category_id.in.(${allCatIds.join(',')}),sub_category_id.in.(${allCatIds.join(',')})`);
        const prodIds = prods?.map(p => p.id) || [];

        if (prodIds.length > 0) {
          await supabase.from('variants').delete().in('product_id', prodIds);
          await supabase.from('products').delete().in('id', prodIds);
        }
        if (subIds.length > 0) {
          await supabase.from('categories').delete().in('id', subIds);
        }
        await supabase.from('categories').delete().eq('id', id);
      }
      
      showToast(`تم حذف ${selectedIds.length} أقسام بنجاح`);
      setSelectedIds([]);
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      showToast("خطأ في الحذف الجماعي: " + err.message, "error");
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-y-auto custom-scrollbar relative font-['Tajawal'] px-4" dir="rtl">
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-10 duration-300 border ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          <span className="font-black text-sm">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 pt-4">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <FolderTree className="text-slate-900" />
          إدارة الأقسام
        </h2>
        <div className="flex gap-3 w-full md:w-auto">
          {selectedIds.length > 0 && (
            <button 
              onClick={() => { setDeleteId(null); setShowDeleteModal(true); }}
              className="flex-1 md:flex-none px-6 py-3 bg-rose-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg animate-in zoom-in"
            >
              <Trash2 size={20} />
              <span>حذف المحددة ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-slate-900" size={40} />
          <p className="font-black text-slate-400">جاري تحميل الهيكلية...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 pb-4">
          <div className="flex flex-col w-full lg:w-1/3 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex-shrink-0">
            <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <LayoutGrid size={20} className="text-emerald-500" />
                <h3 className="font-black text-white text-sm uppercase tracking-tight">الأقسام الرئيسية</h3>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleOpenAdd(null)}
                  className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all shadow-lg"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div className="p-3 space-y-2">
              {mainCategories.map(main => (
                <div
                  key={main.id}
                  onClick={() => setSelectedMainId(main.id)}
                  className={`group relative p-4 rounded-2xl flex items-center justify-between transition-all duration-300 border-2 cursor-pointer ${selectedMainId === main.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl translate-x-1' : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'}`}
                >
                  <span className="font-black text-sm">{main.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => handleOpenEdit(e, main)} className="p-2 rounded-lg hover:bg-white/10" title="تعديل"><Edit3 size={14} /></button>
                    <button onClick={(e) => requestDelete(e, main.id)} className="p-2 rounded-lg hover:bg-rose-500/20 text-rose-500" title="حذف"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col flex-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Layers size={20} className="text-emerald-500" />
                <h3 className="font-black text-white text-sm uppercase tracking-tight">
                  {selectedMainId ? `الأقسام الفرعية لـ (${mainCategories.find(c => c.id === selectedMainId)?.name})` : 'الأقسام الفرعية'}
                </h3>
              </div>
              {selectedMainId && (
                <button 
                  onClick={() => handleOpenAdd(selectedMainId)}
                  className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg"
                >
                  <Plus size={18} />
                </button>
              )}
            </div>
            <div className="p-6 bg-slate-50/30">
              {selectedMainId && subCategories.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in duration-300">
                  {subCategories.map(sub => (
                    <div 
                      key={sub.id} 
                      className="group p-5 rounded-3xl border-2 bg-white border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 shadow-sm">
                          <Tag size={20} />
                        </div>
                        <div className="flex gap-1">
                          <button onClick={(e) => handleOpenEdit(e, sub)} className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 rounded-xl" title="تعديل"><Edit3 size={16} /></button>
                          <button onClick={(e) => requestDelete(e, sub.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 rounded-xl" title="حذف"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <p className="font-black text-lg text-slate-900">{sub.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[400] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 space-y-6 border border-slate-200 animate-in zoom-in-95 duration-200 text-center">
             <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner"><AlertTriangle size={40} /></div>
             <h3 className="text-xl font-black text-slate-900">تأكيد الحذف</h3>
             <p className="text-slate-500 text-sm font-bold leading-relaxed">هل أنت متأكد من حذف هذا القسم نهائياً؟ سيتم حذف كافة التفرعات والأصناف المرتبطة به.</p>
             <div className="flex gap-3"><button onClick={deleteId ? confirmDelete : handleBulkDelete} className="flex-1 py-4 bg-rose-500 text-white font-black rounded-2xl shadow-lg">نعم، حذف</button><button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl">إلغاء</button></div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
               <h3 className="text-xl font-black">{modalMode === 'add' ? 'إضافة قسم جديد' : 'تعديل قسم'}</h3>
               <button onClick={() => setShowAddModal(false)} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">اسم القسم</label>
                <input autoFocus type="text" className="w-full p-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-slate-900 font-black transition-all" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">القسم الأب (الرئيسي)</label>
                <select className="w-full p-4.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none" value={form.parent_id || ''} onChange={(e) => setForm({...form, parent_id: e.target.value || null})}>
                  <option value="">-- بدون (سيصبح قسماً رئيسياً) --</option>
                  {mainCategories.filter(c => c.id !== editingId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button onClick={handleSave} disabled={!form.name || saving} className="w-full py-5 bg-emerald-600 text-white font-black text-xl rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3">
                {saving ? <Loader2 className="animate-spin" size={24} /> : 'حفظ البيانات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
