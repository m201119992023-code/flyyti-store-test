import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Save, 
  Loader2, 
  Smartphone, 
  AlertTriangle,
  Eye,
  Printer,
  CheckSquare,
  Square,
  Calendar,
  Settings2,
  FileDown,
  UserPlus
} from 'lucide-react';
import { supabase } from '../supabase';
import type { Customer } from '../types';
import { printWarrantyReceipt } from '../utils/printThermal';
import * as XLSX from 'xlsx';

interface GroupedCustomer {
  national_id: string;
  customer_name: string;
  phone_number: string;
  purchases: Customer[];
  total_spent: number;
  last_purchase: string;
}

const Customers: React.FC = () => {
  const [rawCustomers, setRawCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // التحكم في النوافذ
  const [showModal, setShowModal] = useState(false); 
  const [showCustomerModal, setShowCustomerModal] = useState(false); 
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<GroupedCustomer | null>(null);
  
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [customerInfo, setCustomerInfo] = useState({
    customer_name: '',
    national_id: '',
    phone_number: ''
  });

  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const [phones, setPhones] = useState([{
    id: undefined as string | undefined,
    phone_model: '',
    storage_capacity: '',
    imei1: '',
    purchase_price: 0
  }]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('phone_customers')
        .select('*')
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      setRawCustomers(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupedCustomers = useMemo(() => {
    const groups: Record<string, GroupedCustomer> = {};
    rawCustomers.forEach(c => {
      if (!groups[c.national_id]) {
        groups[c.national_id] = {
          national_id: c.national_id,
          customer_name: c.customer_name,
          phone_number: c.phone_number,
          purchases: [],
          total_spent: 0,
          last_purchase: c.purchase_date
        };
      }
      groups[c.national_id].purchases.push(c);
      groups[c.national_id].total_spent += Number(c.purchase_price);
      if (new Date(c.purchase_date) > new Date(groups[c.national_id].last_purchase)) {
        groups[c.national_id].last_purchase = c.purchase_date;
      }
    });
    return Object.values(groups).filter(g => 
      g.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.national_id.includes(searchTerm) ||
      g.phone_number.includes(searchTerm) ||
      g.purchases.some(p => p.imei1?.includes(searchTerm))
    ).sort((a, b) => new Date(b.last_purchase).getTime() - new Date(a.last_purchase).getTime());
  }, [rawCustomers, searchTerm]);

  useEffect(() => {
    if (viewingGroup) {
      const updated = groupedCustomers.find(g => g.national_id === viewingGroup.national_id);
      if (updated) setViewingGroup(updated);
    }
  }, [rawCustomers, groupedCustomers]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setViewingGroup(null);
    setCustomerInfo({ customer_name: '', national_id: '', phone_number: '' });
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPhones([{ id: undefined, phone_model: '', storage_capacity: '', imei1: '', purchase_price: 0 }]);
    setShowModal(true);
  };

  const handleOpenAddForExisting = (group: GroupedCustomer) => {
    setModalMode('add');
    setEditingId(null);
    setViewingGroup(group);
    setCustomerInfo({
      customer_name: group.customer_name,
      national_id: group.national_id,
      phone_number: group.phone_number
    });
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPhones([{ id: undefined, phone_model: '', storage_capacity: '', imei1: '', purchase_price: 0 }]);
    setShowModal(true);
  };

  const handleOpenEditCustomer = (group: GroupedCustomer) => {
    setViewingGroup(group);
    setCustomerInfo({
      customer_name: group.customer_name,
      national_id: group.national_id,
      phone_number: group.phone_number
    });
    setShowCustomerModal(true);
  };

  const handleOpenEditDevice = (device: Customer) => {
    setModalMode('edit');
    setEditingId(device.id);
    setCustomerInfo({
      customer_name: device.customer_name,
      national_id: device.national_id,
      phone_number: device.phone_number
    });
    setPurchaseDate(device.purchase_date);
    setPhones([{
      id: device.id,
      phone_model: device.phone_model,
      storage_capacity: device.storage_capacity,
      imei1: device.imei1 || '',
      purchase_price: device.purchase_price
    }]);
    setShowModal(true);
  };

  const handleSaveCustomerInfo = async () => {
    if (!customerInfo.customer_name || !customerInfo.phone_number) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('phone_customers')
        .update({
          customer_name: customerInfo.customer_name,
          phone_number: customerInfo.phone_number,
          national_id: customerInfo.national_id
        })
        .eq('national_id', viewingGroup?.national_id);

      if (error) throw error;
      setShowCustomerModal(false);
      await fetchData();
    } catch (err) {
      alert("حدث خطأ أثناء تحديث بيانات الزبون");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDevice = async () => {
    if (!phones[0].phone_model || !customerInfo.customer_name) return;
    setSaving(true);
    try {
      if (modalMode === 'edit') {
        const p = phones[0];
        const { error } = await supabase
          .from('phone_customers')
          .update({
            phone_model: p.phone_model,
            storage_capacity: p.storage_capacity,
            imei1: p.imei1 || null,
            purchase_price: p.purchase_price,
            purchase_date: purchaseDate
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const records = phones.map(p => ({
          ...customerInfo,
          purchase_date: purchaseDate,
          phone_model: p.phone_model,
          storage_capacity: p.storage_capacity,
          imei1: p.imei1 || null,
          purchase_price: p.purchase_price
        }));
        const { error } = await supabase.from('phone_customers').insert(records);
        if (error) throw error;
      }
      setShowModal(false);
      await fetchData();
    } catch (err) {
      alert("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await supabase.from('phone_customers').delete().eq('id', deleteTargetId);
      setShowDeleteConfirm(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDeviceSelection = (id: string) => {
    setSelectedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrintSelected = () => {
    if (selectedDeviceIds.length === 0) return;
    const selectedPurchases = rawCustomers.filter(c => selectedDeviceIds.includes(c.id));
    const serialIdx = 100001 + Math.floor(Math.random() * 9000);
    printWarrantyReceipt(selectedPurchases, serialIdx);
  };

  const handleExportExcel = () => {
    if (rawCustomers.length === 0) return;
    const exportData = rawCustomers.map(c => ({
      "اسم الزبون": c.customer_name,
      "رقم الهوية": c.national_id,
      "رقم الهاتف": c.phone_number,
      "تاريخ الشراء": c.purchase_date,
      "موديل الجهاز": c.phone_model,
      "السعة": c.storage_capacity,
      "الرقم التسلسلي / IMEI": c.imei1 || '---',
      "السعر (₪)": c.purchase_price
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    const wscols = [
      {wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 10}, {wch: 25}, {wch: 12}
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أرشيف مبيعات الهواتف");
    XLSX.writeFile(wb, `Flyyti_Customers_Archive_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-4 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar font-['Tajawal']" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <Users className="text-emerald-600" />
          أرشيف مبيعات الأجهزة
        </h2>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={handleExportExcel} className="flex-1 md:flex-none px-6 py-4 bg-white border-2 border-slate-200 text-slate-700 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
            <FileDown size={20} className="text-emerald-600" />
            تصدير الأرشيف (Excel)
          </button>
          <button onClick={handleOpenAdd} className="flex-1 md:flex-none px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-500 transition-all active:scale-95">
            <Plus size={20} />
            إضافة زبون جديد
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm shrink-0">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={20} />
          <input type="text" placeholder="ابحث باسم الزبون، رقم الهوية، أو IMEI الجهاز..." className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-600 focus:bg-white transition-all font-black text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Customers Table */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4"><Loader2 className="animate-spin text-emerald-600" size={40} /><p className="font-black text-slate-400">تحميل الأرشيف...</p></div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hidden lg:block">
            <table className="w-full text-right border-collapse">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-6 text-xs font-black uppercase">الزبون</th>
                  <th className="p-6 text-xs font-black uppercase text-center">بيانات الاتصال</th>
                  <th className="p-6 text-xs font-black uppercase text-center">الأجهزة</th>
                  <th className="p-6 text-xs font-black uppercase text-center">إجمالي المسحوبات</th>
                  <th className="p-6 text-xs font-black uppercase text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedCustomers.map(g => (
                  <tr key={g.national_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6"><div><p className="font-black text-slate-900">{g.customer_name}</p><p className="text-[10px] font-bold text-slate-400 uppercase">آخر عملية: {g.last_purchase}</p></div></td>
                    <td className="p-6 text-center"><div className="flex flex-col gap-1 text-xs font-bold text-slate-600"><span>{g.national_id}</span><span className="text-emerald-600">{g.phone_number}</span></div></td>
                    <td className="p-6 text-center"><span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl font-black text-xs border border-blue-100">{g.purchases.length} أجهزة</span></td>
                    <td className="p-6 text-center"><span className="font-black text-slate-900">{Math.round(g.total_spent)} ₪</span></td>
                    <td className="p-6 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenAddForExisting(g)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="إضافة جهاز جديد لهذا الزبون"><UserPlus size={18} /></button>
                        <button onClick={() => { setViewingGroup(g); setSelectedDeviceIds([]); setShowViewModal(true); }} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-black transition-all flex items-center gap-2"><Eye size={16} />عرض السجل</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal: سجل الأجهزة */}
      {showViewModal && viewingGroup && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl flex items-center justify-center z-[250] p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl my-auto overflow-hidden flex flex-col border border-white/10 animate-in zoom-in duration-200">
            <div className="p-8 bg-blue-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-2xl"><Users size={32} /></div>
                <div>
                  <h3 className="text-2xl font-black">{viewingGroup.customer_name}</h3>
                  <p className="text-xs font-bold opacity-80">ID: {viewingGroup.national_id} | Phone: {viewingGroup.phone_number}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenAddForExisting(viewingGroup)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-lg"><UserPlus size={18} /> إضافة جهاز</button>
                <button onClick={() => handleOpenEditCustomer(viewingGroup)} className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-all" title="تعديل بيانات الزبون"><Edit3 size={24} /></button>
                <button onClick={() => setShowViewModal(false)} className="p-3 bg-white/10 rounded-xl"><X size={24} /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-6 max-h-[70vh] custom-scrollbar">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex gap-4 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none p-5 bg-blue-50 rounded-3xl border border-blue-100 text-center"><p className="text-[10px] font-black text-blue-400 mb-1 uppercase">إجمالي المشتريات</p><p className="text-2xl font-black text-blue-600">{Math.round(viewingGroup.total_spent)} ₪</p></div>
                    <div className="flex-1 sm:flex-none p-5 bg-emerald-50 rounded-3xl border border-emerald-100 text-center"><p className="text-[10px] font-black text-emerald-400 mb-1 uppercase">عدد الأجهزة</p><p className="text-2xl font-black text-emerald-600">{viewingGroup.purchases.length}</p></div>
                 </div>
                 <button 
                  onClick={handlePrintSelected}
                  disabled={selectedDeviceIds.length === 0}
                  className="w-full sm:w-auto px-10 py-5 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 disabled:opacity-30 transition-all shadow-xl active:scale-95"
                 >
                  <Printer size={22} />
                  <span>طباعة الكفالة المجمعة ({selectedDeviceIds.length})</span>
                 </button>
              </div>

              <div className="space-y-3">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">اختر الأجهزة المراد طباعتها في فاتورة واحدة:</p>
                 {viewingGroup.purchases.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => toggleDeviceSelection(p.id)}
                      className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col sm:flex-row justify-between items-center gap-4 cursor-pointer ${selectedDeviceIds.includes(p.id) ? 'bg-blue-50 border-blue-600 shadow-md scale-[1.01]' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                    >
                       <div className="flex items-center gap-4 w-full sm:w-auto text-right">
                          <div className={`p-3 rounded-2xl transition-colors ${selectedDeviceIds.includes(p.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {selectedDeviceIds.includes(p.id) ? <CheckSquare size={24} /> : <Square size={24} />}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-lg leading-tight">{p.phone_model} <span className="text-xs text-slate-400 font-bold ml-2">({p.storage_capacity})</span></p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1">IMEI: <span className="font-mono text-blue-600">{p.imei1 || 'N/A'}</span></p>
                            <p className="text-[10px] font-black text-blue-400 mt-1 uppercase flex items-center gap-1"><Calendar size={12}/> {p.purchase_date}</p>
                          </div>
                       </div>
                       
                       <div className="flex items-center justify-between w-full sm:w-auto gap-8 sm:border-r sm:pr-8 border-slate-100">
                          <div className="text-center sm:text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase">قيمة الشراء</p>
                            <p className="font-black text-emerald-600 text-xl">{Math.round(p.purchase_price)} ₪</p>
                          </div>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleOpenEditDevice(p)} className="p-3 text-blue-600 bg-white border border-blue-100 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="تعديل بيانات الجهاز"><Settings2 size={18} /></button>
                            <button onClick={() => { setDeleteTargetId(p.id); setShowDeleteConfirm(true); }} className="p-3 text-rose-600 bg-white border border-rose-100 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="حذف السجل"><Trash2 size={18} /></button>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: تعديل بيانات الزبون (Customer Only) */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[400] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in duration-200">
            <div className="p-8 bg-[#0f172a] text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-600 rounded-2xl shadow-xl"><Edit3 size={24} /></div>
                <h3 className="text-xl font-black">تعديل بيانات الزبون</h3>
              </div>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 bg-white/10 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">الاسم الكامل</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-black" value={customerInfo.customer_name} onChange={(e) => setCustomerInfo({...customerInfo, customer_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">رقم الهوية</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-black" value={customerInfo.national_id} onChange={(e) => setCustomerInfo({...customerInfo, national_id: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">رقم الهاتف</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-blue-600 font-black text-left" dir="ltr" value={customerInfo.phone_number} onChange={(e) => setCustomerInfo({...customerInfo, phone_number: e.target.value})} />
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3"><AlertTriangle className="text-blue-600 shrink-0" size={18} /><p className="text-[10px] text-blue-800 font-bold leading-relaxed">ملاحظة: سيتم تحديث هذه البيانات في جميع سجلات الأجهزة التابعة لهذا الزبون.</p></div>
              <button onClick={handleSaveCustomerInfo} disabled={saving} className="w-full py-5 bg-blue-600 text-white font-black text-xl rounded-[1.8rem] shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-blue-700">
                {saving ? <Loader2 className="animate-spin" /> : <Save />} <span>تحديث بيانات الزبون</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: إضافة/تعديل بيانات الجهاز (Device Only) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[350] p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl my-auto overflow-hidden flex flex-col border border-white/10 animate-in zoom-in duration-200">
            <div className={`p-8 text-white flex items-center justify-between ${modalMode === 'add' ? 'bg-[#0f172a]' : 'bg-emerald-600'}`}>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-2xl shadow-xl">{modalMode === 'add' ? <Plus size={28} /> : <Smartphone size={28} />}</div>
                <h3 className="text-xl font-black">{modalMode === 'add' ? 'تسجيل عملية بيع جديدة' : 'تعديل بيانات الجهاز'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-1">اسم الزبون</label>
                  <input type="text" readOnly={!!viewingGroup && modalMode === 'add'} className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black ${!!viewingGroup && modalMode === 'add' ? 'opacity-60 cursor-not-allowed' : 'focus:border-blue-600'}`} value={customerInfo.customer_name} onChange={(e) => setCustomerInfo({...customerInfo, customer_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-1">الهوية</label>
                  <input type="text" readOnly={!!viewingGroup && modalMode === 'add'} className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black ${!!viewingGroup && modalMode === 'add' ? 'opacity-60 cursor-not-allowed' : 'focus:border-blue-600'}`} value={customerInfo.national_id} onChange={(e) => setCustomerInfo({...customerInfo, national_id: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-1">الهاتف</label>
                  <input type="text" readOnly={!!viewingGroup && modalMode === 'add'} className={`w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-left ${!!viewingGroup && modalMode === 'add' ? 'opacity-60 cursor-not-allowed' : 'focus:border-blue-600'}`} dir="ltr" value={customerInfo.phone_number} onChange={(e) => setCustomerInfo({...customerInfo, phone_number: e.target.value})} />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-100">
                <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2"><Smartphone size={18} className="text-emerald-600"/> تفاصيل الجهاز</h4>
                {phones.map((p, idx) => (
                    <div key={idx} className="p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 relative">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">موديل الجهاز</label><input className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-sm" placeholder="e.g. iPhone 15 Pro Max" value={p.phone_model} onChange={(e) => { const newP = [...phones]; newP[idx].phone_model = e.target.value; setPhones(newP); }} /></div>
                          <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">السعة</label><input className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-sm" placeholder="e.g. 256GB" value={p.storage_capacity} onChange={(e) => { const newP = [...phones]; newP[idx].storage_capacity = e.target.value; setPhones(newP); }} /></div>
                          <div className="space-y-1"><label className="text-[10px] font-black text-blue-600 uppercase">رقم IMEI</label><input className="w-full p-4 bg-white rounded-2xl border-2 border-blue-100 font-black text-sm text-left font-mono" dir="ltr" placeholder="Serial or IMEI" value={p.imei1} onChange={(e) => { const newP = [...phones]; newP[idx].imei1 = e.target.value; setPhones(newP); }} /></div>
                          <div className="space-y-1"><label className="text-[10px] font-black text-emerald-600 uppercase">سعر البيع النهائي</label><input type="number" className="w-full p-4 bg-white rounded-2xl border-2 border-emerald-100 font-black text-xl text-center text-emerald-600" value={p.purchase_price || ''} onChange={(e) => { const newP = [...phones]; newP[idx].purchase_price = Number(e.target.value); setPhones(newP); }} /></div>
                       </div>
                       {phones.length > 1 && modalMode === 'add' && (<button onClick={() => setPhones(phones.filter((_, i) => i !== idx))} className="absolute -top-3 -right-3 w-10 h-10 bg-white text-rose-500 rounded-full shadow-lg border border-slate-200 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={18} /></button>)}
                    </div>
                ))}
                {modalMode === 'add' && (
                  <button onClick={() => setPhones([...phones, { id: undefined, phone_model: '', storage_capacity: '', imei1: '', purchase_price: 0 }])} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black flex items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-600 transition-all"><Plus size={20} /> إضافة جهاز آخر لهذا الزبون</button>
                )}
              </div>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <Calendar className="text-slate-400" size={24} />
                 <input type="date" className="p-3 bg-white border-2 border-slate-200 rounded-xl font-black text-xs outline-none focus:border-blue-600" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
              </div>
              <button 
                onClick={handleSaveDevice} 
                disabled={saving} 
                className={`px-12 py-5 text-white font-black text-xl rounded-[1.8rem] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 ${modalMode === 'add' ? 'bg-[#0f172a] hover:bg-black' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                <span>{modalMode === 'add' ? 'تأكيد عملية البيع' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-sm overflow-hidden p-10 space-y-6 text-center animate-in zoom-in duration-200">
            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner"><AlertTriangle size={50} /></div>
            <div><h3 className="text-2xl font-black text-slate-900">حذف السجل</h3><p className="text-slate-500 text-sm mt-2 font-bold leading-relaxed">سيتم مسح بيانات الجهاز نهائياً من أرشيف هذا الزبون. هل أنت متأكد؟</p></div>
            <div className="flex gap-4"><button onClick={confirmDelete} className="flex-1 py-5 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700">تأكيد الحذف</button><button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl">إلغاء</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;