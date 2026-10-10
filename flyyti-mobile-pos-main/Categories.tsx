
import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Tag, ChevronDown, ChevronRight, X } from 'lucide-react';
import { supabase } from '../supabase';
import type { Category } from '../types';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', parent_id: null as string | null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newCat.name) return;
    await supabase.from('categories').insert(newCat);
    setShowAddModal(false);
    setNewCat({ name: '', parent_id: null });
    fetchCategories();
  };

  const handleDelete = async (id: string) => {
    if (confirm("سيتم حذف القسم وكافة الأقسام التابعة له والأصناف المرتبطة به. هل أنت متأكد؟")) {
      await supabase.from('categories').delete().eq('id', id);
      fetchCategories();
    }
  };

  const mainCategories = categories.filter(c => !c.parent_id);

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-900">الأقسام</h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-100"
        >
          <Plus size={20} />
          إضافة قسم
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mainCategories.map(main => (
          <div key={main.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Tag size={18} />
                </div>
                <h3 className="font-black text-gray-900">{main.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setNewCat({ name: '', parent_id: main.id }); setShowAddModal(true); }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Plus size={18} />
                </button>
                <button onClick={() => handleDelete(main.id)} className="p-2 text-red-400 hover:text-red-600 rounded-lg">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-gray-50">
              {categories.filter(c => c.parent_id === main.id).map(sub => (
                <div key={sub.id} className="p-4 pr-12 flex items-center justify-between hover:bg-gray-50/30 transition-colors">
                  <div className="flex items-center gap-2 text-gray-600">
                    <ChevronRight size={14} />
                    <span className="font-bold">{sub.name}</span>
                  </div>
                  <button onClick={() => handleDelete(sub.id)} className="p-2 text-gray-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {categories.filter(c => c.parent_id === main.id).length === 0 && (
                <p className="p-4 pr-12 text-xs text-gray-400 italic">لا توجد أقسام فرعية</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
              <h3 className="text-xl font-black text-blue-900">إضافة قسم جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">اسم القسم</label>
                <input 
                  autoFocus
                  type="text" 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-blue-500" 
                  value={newCat.name}
                  onChange={(e) => setNewCat({...newCat, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 mr-1">القسم الرئيسي (اختياري)</label>
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-blue-500"
                  value={newCat.parent_id || ''}
                  onChange={(e) => setNewCat({...newCat, parent_id: e.target.value || null})}
                >
                  <option value="">-- قسم رئيسي --</option>
                  {mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button 
                onClick={handleAdd}
                className="w-full py-4 bg-blue-600 text-white font-black text-lg rounded-2xl shadow-xl hover:bg-blue-700 transition-all"
              >
                حفظ القسم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
