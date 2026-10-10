import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  ChevronDown,
  Package,
  X,
  Save,
  Loader2,
  Edit3,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Copy,
  FileSpreadsheet,
  FileDown,
  UploadCloud,
  RefreshCw,
  Boxes,
  PlusCircle,
  Smartphone,
  Coins,
  List,
  Layers,
  AlertCircle,
  Download,
  Info,
  ChevronUp,
  Factory,
  Zap
} from 'lucide-react';
import { supabase } from '../supabase';
import type { Category, Variant } from '../types';
import * as XLSX from 'xlsx';

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [quickAddBarcode, setQuickAddBarcode] = useState('');
  const [quickAddQty, setQuickAddQty] = useState(1);
  
  const [openSections, setOpenSections] = useState({ 
    general: false, 
    phones: false, 
    outOfStockProducts: false, 
    outOfStockVariants: false 
  });
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{id: string | null, type: 'single' | 'bulk' | 'all'}>({id: null, type: 'single'});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneImportRef = useRef<HTMLInputElement>(null);

  const [filterMainCat, setFilterMainCat] = useState('all');
  const [filterSubCat, setFilterSubCat] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterManufacturer, setFilterManufacturer] = useState('all');

  const [form, setForm] = useState({
    name: '', category_id: '', sub_category_id: '',
    variants: [{ id: undefined as string | undefined, name: '', barcode: '', supplier: '', manufacturer: '', cost_price: 0, sale_price: 0, suggested_discount: 0, stock_quantity: 0 }]
  });

  const [phoneForm, setPhoneForm] = useState({
    model: '', manufacturer: '', sub_category_id: '', capacity: '', cost_price: 0, sale_price: 0, suggested_discount: 0,
    imeis: ['']
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: prods, error: pErr } = await supabase.from('products').select('*, variants(*)').order('created_at', { ascending: false });
      const { data: cats, error: cErr } = await supabase.from('categories').select('*').order('name');
      if (pErr) throw pErr;
      if (cErr) throw cErr;
      setProducts(prods || []);
      setCategories(cats || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleQuickAdd = async () => {
    if (!quickAddBarcode || quickAddQty <= 0) return;
    setSaving(true);
    try {
      // البحث عن الصنف عبر الباركود
      const { data: variant, error: findError } = await supabase
        .from('variants')
        .select('id, stock_quantity, name')
        .eq('barcode', quickAddBarcode.trim())
        .maybeSingle();

      if (findError) throw findError;
      if (!variant) {
        showToast("الباركود غير مسجل في النظام", "error");
        setSaving(false);
        return;
      }

      const newQty = (variant.stock_quantity || 0) + quickAddQty;
      
      // تحديث الكمية في قاعدة البيانات
      const { error: updateError } = await supabase
        .from('variants')
        .update({ stock_quantity: newQty })
        .eq('id', variant.id);

      if (updateError) throw updateError;

      showToast(`تم إضافة ${quickAddQty} قطع لـ "${variant.name}" بنجاح. الكمية الجديدة: ${newQty}`);
      setQuickAddBarcode('');
      setQuickAddQty(1);
      setShowQuickAddModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const phoneCatId = useMemo(() => categories.find(c => (c.name === 'الهواتف' || c.name === 'هواتف') && !c.parent_id)?.id, [categories]);

  const inventoryStats = useMemo(() => {
    const stats = { totalProducts: products.length, totalPieces: 0, inventoryCostValue: 0, phoneCostValue: 0, outOfStockCount: 0, outOfStockVariantsCount: 0 };
    products.forEach(p => {
      const isPhone = p.category_id === phoneCatId;
      const variants = p.variants || [];
      let productQty = 0;
      variants.forEach((v: any) => {
        const qty = Number(v.stock_quantity) || 0;
        const cost = Number(v.cost_price) || 0;
        stats.totalPieces += qty;
        productQty += qty;
        if (isPhone) stats.phoneCostValue += (qty * cost);
        else stats.inventoryCostValue += (qty * cost);
        if (qty <= 0) stats.outOfStockVariantsCount++;
      });
      if (variants.length > 0 && productQty <= 0) stats.outOfStockCount++;
    });
    return stats;
  }, [products, phoneCatId]);

  const mainCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);
  const suppliers = useMemo(() => Array.from(new Set(products.flatMap(p => p.variants?.map((v: any) => v.supplier)).filter(Boolean))), [products]);
  const manufacturers = useMemo(() => Array.from(new Set(products.flatMap(p => p.variants?.map((v: any) => v.manufacturer)).filter(Boolean))), [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const variants = p.variants || [];
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        variants.some((v: any) => v.barcode?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchMain = filterMainCat === 'all' || p.category_id === filterMainCat;
      const matchSub = filterSubCat === 'all' || p.sub_category_id === filterSubCat;
      const matchSupplier = filterSupplier === 'all' || variants.some((v: any) => v.supplier === filterSupplier);
      const matchManuf = filterManufacturer === 'all' || variants.some((v: any) => v.manufacturer === filterManufacturer);
      return matchSearch && matchMain && matchSub && matchSupplier && matchManuf;
    });
  }, [products, searchTerm, filterMainCat, filterSubCat, filterSupplier, filterManufacturer]);

  const generalList = filtered.filter(p => p.category_id !== phoneCatId && p.variants?.some((v: any) => v.stock_quantity > 0));
  const phoneList = filtered.filter(p => p.category_id === phoneCatId && p.variants?.some((v: any) => v.stock_quantity > 0));
  const outOfStockProducts = filtered.filter(p => p.variants?.length > 0 && p.variants.every((v: any) => (Number(v.stock_quantity) || 0) <= 0));
  const outOfStockVariants = useMemo(() => {
    const list: any[] = [];
    filtered.forEach(p => {
      p.variants?.forEach((v: any) => {
        if ((Number(v.stock_quantity) || 0) <= 0 && p.variants.some((anyV: any) => anyV.stock_quantity > 0)) {
          list.push({ ...v, product_name: p.name, product_ref: p });
        }
      });
    });
    return list;
  }, [filtered]);

  const sanitizeUUID = (id: string | null | undefined) => (!id || id === 'all' || id === '') ? null : id;

  const handleDuplicate = async (id: string) => {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    setSaving(true);
    try {
      const { data: newP } = await supabase.from('products').insert({ name: `${p.name} (نسخة)`, category_id: p.category_id, sub_category_id: p.sub_category_id }).select().single();
      if (newP && p.variants) {
        const newV = p.variants.map((v: any) => ({ ...v, id: undefined, product_id: newP.id, stock_quantity: 0 }));
        await supabase.from('variants').insert(newV);
      }
      showToast("تم تكرار الصنف بنجاح");
      fetchData();
    } catch (e) { showToast("فشل التكرار", "error"); }
    finally { setSaving(false); }
  };

  const handleBulkDuplicate = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    for (const id of selectedIds) { await handleDuplicate(id); }
    setSelectedIds([]);
    setSaving(false);
  };

  const handleSaveProduct = async () => {
    if (!form.name || saving) return;
    setSaving(true);
    try {
      const pData = { name: form.name.trim(), category_id: sanitizeUUID(form.category_id), sub_category_id: sanitizeUUID(form.sub_category_id) };
      let prodId = editingId;
      if (modalMode === 'add') {
        const { data: p, error } = await supabase.from('products').insert(pData).select().single();
        if (error) throw error;
        prodId = p.id;
      } else {
        await supabase.from('products').update(pData).eq('id', prodId);
      }
      const vData = form.variants.map(v => ({ product_id: prodId, name: v.name || 'افتراضي', barcode: v.barcode || null, supplier: v.supplier || null, manufacturer: v.manufacturer || null, cost_price: Number(v.cost_price) || 0, sale_price: Number(v.sale_price) || 0, suggested_discount: Number(v.suggested_discount) || 0, stock_quantity: Number(v.stock_quantity) || 0 }));
      if (modalMode === 'edit') await supabase.from('variants').delete().eq('product_id', prodId);
      await supabase.from('variants').insert(vData);
      setShowModal(false);
      showToast("تم حفظ الصنف والبيانات");
      fetchData();
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setSaving(false); }
  };

  const handleSavePhone = async () => {
    if (!phoneForm.model || saving) return;
    setSaving(true);
    try {
      const { data: p, error } = await supabase.from('products').insert({ name: phoneForm.model.trim(), category_id: phoneCatId, sub_category_id: sanitizeUUID(phoneForm.sub_category_id) }).select().single();
      if (error) throw error;
      const validImeis = phoneForm.imeis.filter(i => i.trim() !== '');
      const vData = validImeis.map(imei => ({ product_id: p.id, name: phoneForm.capacity || 'بدون سعة', barcode: imei.trim(), manufacturer: phoneForm.manufacturer || null, cost_price: Number(phoneForm.cost_price) || 0, sale_price: Number(phoneForm.sale_price) || 0, suggested_discount: Number(phoneForm.suggested_discount) || 0, stock_quantity: 1 }));
      await supabase.from('variants').insert(vData);
      setShowPhoneModal(false);
      showToast("تم إضافة الهواتف للأرشيف والمخزون");
      fetchData();
    } catch (err: any) { showToast(err.message, "error"); }
    finally { setSaving(false); }
  };

  const handleExport = () => {
    const listToExport = selectedIds.length > 0 ? products.filter(p => selectedIds.includes(p.id)) : filtered;
    const data = listToExport.flatMap(p => p.variants.map((v: any) => ({ 'اسم الصنف': p.name, 'النوع': v.name, 'الباركود/IMEI': v.barcode, 'المورد': v.supplier, 'الشركة المصنعة': v.manufacturer, 'التكلفة': v.cost_price, 'البيع': v.sale_price, 'الكمية': v.stock_quantity })));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    XLSX.writeFile(wb, `Flyyti_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>, type: 'general' | 'phone') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        
        const { data: currentCats } = await supabase.from('categories').select('*');
        let tempCats = [...(currentCats || [])];
        const sessionProducts: Record<string, string> = {};

        for (const row of rows) {
          const mainCatName = type === 'phone' ? 'الهواتف' : (row['القسم الرئيسي'] || 'عام');
          const subCatName = row['القسم الفرعي'] || null;
          const productName = (type === 'phone' ? row['نوع الجهاز'] : row['اسم الصنف']) || 'بدون اسم';

          let mainCat = tempCats.find(c => c.name === mainCatName && !c.parent_id);
          if (!mainCat) {
            const { data: newMain } = await supabase.from('categories').insert({ name: mainCatName }).select().single();
            if (newMain) {
              mainCat = newMain;
              tempCats.push(newMain);
            }
          }

          let subCatId: string | null = null;
          if (subCatName && mainCat) {
            let subCat = tempCats.find(c => c.name === subCatName && c.parent_id === mainCat!.id);
            if (!subCat) {
              const { data: newSub } = await supabase.from('categories').insert({ name: subCatName, parent_id: mainCat.id }).select().single();
              if (newSub) {
                subCat = newSub;
                tempCats.push(newSub);
              }
            }
            subCatId = subCat ? subCat.id : null;
          }

          const productKey = `${productName.trim()}-${mainCat?.id || 'null'}-${subCatId || 'null'}`;
          let prodId = sessionProducts[productKey];

          if (!prodId) {
            const { data: existingProd } = await supabase
              .from('products')
              .select('id')
              .eq('name', productName.trim())
              .eq('category_id', mainCat?.id || null)
              .eq('sub_category_id', subCatId)
              .maybeSingle();

            if (existingProd) {
              prodId = existingProd.id;
            } else {
              const { data: newProd } = await supabase
                .from('products')
                .insert({ 
                  name: productName.trim(), 
                  category_id: mainCat?.id || null, 
                  sub_category_id: subCatId 
                })
                .select().single();
              if (newProd) prodId = newProd.id;
            }
            sessionProducts[productKey] = prodId;
          }

          if (prodId) {
            const variantData = {
              product_id: prodId,
              name: (type === 'phone' ? row['المساحة'] : row['النوع']) || 'افتراضي',
              barcode: (type === 'phone' ? row['IMEI'] : row['الباركود'])?.toString() || null,
              cost_price: Number(row['التكلفة']) || 0,
              sale_price: Number(row['البيع']) || 0,
              suggested_discount: Number(row['الخصم المقترح']) || 0,
              stock_quantity: type === 'phone' ? 1 : (Number(row['الكمية']) || 0),
              manufacturer: row['شركة التصنيع'] || row['الشركة المصنعة'] || null,
              supplier: row['المورد'] || null
            };

            await supabase.from('variants').insert(variantData);
          }
        }
        
        showToast("تم استيراد البيانات وتجميع الأصناف بنجاح");
        fetchData();
        setShowModal(false); 
        setShowPhoneModal(false);
      } catch (err) { 
        console.error(err);
        showToast("خطأ أثناء الاستيراد، تأكد من ملف الإكسل", "error"); 
      }
      finally { setSaving(false); if(e.target) e.target.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = (type: 'general' | 'phone') => {
    const headers = type === 'general' ? [['اسم الصنف', 'القسم الرئيسي', 'القسم الفرعي', 'النوع', 'الباركود', 'المورد', 'الشركة المصنعة', 'التكلفة', 'البيع', 'الخصم المقترح', 'الكمية']] : [['نوع الجهاز', 'شركة التصنيع', 'القسم الفرعي', 'المساحة', 'التكلفة', 'البيع', 'الخصم المقترح', 'IMEI']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Flyyti_${type === 'general' ? 'Products' : 'Phones'}_Template.xlsx`);
  };

  const StatBox = ({ title1, val1, title2, val2, icon: Icon, color }: any) => (
    <div className={`bg-white p-6 rounded-[2rem] border-2 shadow-sm flex items-center gap-5 relative overflow-hidden ${color}`}>
       <div className="p-4 bg-slate-50 rounded-2xl text-slate-900 border border-slate-100 shrink-0"><Icon size={28} /></div>
       <div className="flex-1 space-y-2">
          <div className="flex justify-between items-baseline"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title1}</span><span className="text-xl font-black text-slate-900">{val1.toLocaleString()}</span></div>
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-50"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title2}</span><span className="text-sm font-black text-slate-700">{Math.round(val2).toLocaleString()} ₪</span></div>
       </div>
    </div>
  );

  const AccordionSection = ({ id, title, icon: Icon, count, list }: any) => {
    const isOpen = (openSections as any)[id];
    const listIds = list.map((p: any) => p.id || p.product_id);
    const isAllSelected = listIds.length > 0 && listIds.every((id: string) => selectedIds.includes(id));

    return (
      <div className={`bg-white rounded-[2rem] border-2 shadow-sm mb-4 overflow-hidden transition-all ${id.includes('outOfStock') ? 'border-rose-100' : id === 'phones' ? 'border-blue-100' : 'border-slate-100'}`}>
        <button onClick={() => setOpenSections(prev => ({ ...prev, [id]: !isOpen }))} className={`w-full p-6 flex items-center justify-between transition-colors ${isOpen ? 'bg-slate-50' : 'bg-white'}`}>
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-xl ${id.includes('outOfStock') ? 'bg-rose-600' : id === 'phones' ? 'bg-blue-600' : 'bg-emerald-600'} text-white`}><Icon size={20} /></div>
             <div className="text-right"><h3 className="font-black text-slate-900">{title}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{count} سجل متوفر</p></div>
          </div>
          <ChevronDown className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="p-4 overflow-x-auto custom-scrollbar border-t border-slate-50 animate-in slide-in-from-top-2">
             <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase bg-slate-50/50">
                    <th className="p-4 w-12 text-center">
                      <button onClick={() => isAllSelected ? setSelectedIds(prev => prev.filter(sid => !listIds.includes(sid))) : setSelectedIds(prev => Array.from(new Set([...prev, ...listIds])))}>
                        {isAllSelected ? <CheckSquare className="text-emerald-600" size={18}/> : <Square size={18}/>}
                      </button>
                    </th>
                    <th className="p-4">الصنف / النوع</th>
                    <th className="p-4 text-center">التكلفة</th>
                    <th className="p-4 text-center">البيع</th>
                    <th className="p-4 text-center">الرصيد</th>
                    <th className="p-4 text-left">خيارات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {list.map((item: any) => {
                    const isVariant = !!item.product_name;
                    const p = isVariant ? item.product_ref : item;
                    const v = isVariant ? item : p.variants?.[0];
                    const totalQty = isVariant ? item.stock_quantity : p.variants?.reduce((s: number, x: any) => s + (Number(x.stock_quantity) || 0), 0);
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors group ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                        <td className="p-4 text-center">
                           <button onClick={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(i => i !== p.id) : [...prev, p.id])}>
                              {isSelected ? <CheckSquare className="text-emerald-600" size={18}/> : <Square size={18} className="text-slate-200" />}
                           </button>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors"><List size={14}/></div>
                              <div>
                                <p className="font-black text-slate-900 text-sm">{isVariant ? `${item.product_name} - ${item.name}` : p.name}</p>
                                <p className="text-[10px] font-mono text-slate-400">{v?.barcode || '---'}</p>
                              </div>
                           </div>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-400 text-sm">{Math.round(v?.cost_price || 0)} ₪</td>
                        <td className="p-4 text-center font-black text-slate-900 text-sm">{Math.round(v?.sale_price || 0)} ₪</td>
                        <td className="p-4 text-center">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black ${totalQty > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{totalQty} ق</span>
                        </td>
                        <td className="p-4 text-left">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => handleDuplicate(p.id)} title="تكرار الصنف" className="p-2 text-blue-400 hover:text-blue-600 bg-white border border-slate-100 rounded-xl shadow-sm"><Copy size={14}/></button>
                              <button onClick={() => { setEditingId(p.id); setModalMode('edit'); setForm({ name: p.name, category_id: p.category_id || '', sub_category_id: p.sub_category_id || '', variants: p.variants.map((vx: any) => ({ ...vx })) }); setShowModal(true); }} className="p-2 text-slate-400 hover:text-emerald-600 bg-white border border-slate-100 rounded-xl shadow-sm"><Edit3 size={14}/></button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar relative px-4 pb-24 font-['Tajawal']" dir="rtl">
      {toast && (<div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-10 duration-300 border ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}><CheckCircle2 size={24} /><span className="font-black text-sm">{toast.message}</span></div>)}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 shrink-0">
        <StatBox title1="إجمالي الأصناف" val1={inventoryStats.totalProducts} title2="إجمالي عدد القطع" val2={inventoryStats.totalPieces} icon={Boxes} color="border-slate-100" />
        <StatBox title1="قيمة المخزون العام" val1={inventoryStats.inventoryCostValue} title2="قيمة مخزون الهواتف" val2={inventoryStats.phoneCostValue} icon={Coins} color="border-emerald-100" />
        <StatBox title1="أصناف نافدة كلياً" val1={inventoryStats.outOfStockCount} title2="أنواع وموديلات نافدة جزئياً" val2={inventoryStats.outOfStockVariantsCount} icon={Ban} color="border-rose-100" />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm mt-8 p-6 space-y-6 shrink-0">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
           <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3"><Package className="text-emerald-600" /> إدارة المستودع والمخزون</h2>
           <div className="flex flex-wrap gap-2 w-full xl:w-auto">
              {selectedIds.length > 0 && (
                <div className="flex gap-2 animate-in zoom-in">
                  <button onClick={() => { setDeleteTarget({id: null, type: 'bulk'}); setShowDeleteConfirm(true); }} className="px-6 py-4 bg-rose-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg"><Trash2 size={18} /> حذف المحدد ({selectedIds.length})</button>
                  <button onClick={handleBulkDuplicate} className="px-6 py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg"><Copy size={18} /> تكرار المحدد</button>
                </div>
              )}
              <button onClick={() => setShowQuickAddModal(true)} className="px-6 py-4 bg-amber-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-amber-700 active:scale-95"><Zap size={18} /> توريد سريع (باركود)</button>
              <button onClick={handleExport} className="px-6 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"><Download size={18} /> تصدير المفلتر</button>
              <button onClick={() => setShowPhoneModal(true)} className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95"><Smartphone size={18} /> إضافة هاتف</button>
              <button onClick={() => { setModalMode('add'); setShowModal(true); setForm({ name: '', category_id: '', sub_category_id: '', variants: [{ id: undefined, name: '', barcode: '', supplier: '', manufacturer: '', cost_price: 0, sale_price: 0, suggested_discount: 0, stock_quantity: 0 }] }); }} className="px-8 py-4 bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95"><Plus size={18} /> إضافة صنف</button>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
           <div className="relative lg:col-span-1"><Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="بحث بالاسم، باركود، IMEI..." className="w-full pr-10 pl-3 py-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none focus:border-emerald-600 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
           <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none" value={filterMainCat} onChange={(e) => { setFilterMainCat(e.target.value); setFilterSubCat('all'); }}><option value="all">الأقسام الرئيسية</option>{mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
           <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none" value={filterSubCat} onChange={(e) => setFilterSubCat(e.target.value)}><option value="all">الأقسام الفرعية</option>{categories.filter(c => c.parent_id === filterMainCat).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
           <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none" value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)}><option value="all">كل الموردين</option>{suppliers.map(s => <option key={s} value={s}>{s}</option>)}</select>
           <select className="p-3 bg-slate-50 border border-slate-100 rounded-xl font-black text-xs outline-none" value={filterManufacturer} onChange={(e) => setFilterManufacturer(e.target.value)}><option value="all">شركة التصنيع</option>{manufacturers.map(m => <option key={m} value={m}>{m}</option>)}</select>
           <button onClick={() => { setFilterMainCat('all'); setFilterSubCat('all'); setFilterSupplier('all'); setFilterManufacturer('all'); setSearchTerm(''); setSelectedIds([]); }} className="p-3 bg-slate-900 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all hover:bg-black"><RefreshCw size={14} /> إعادة تعيين</button>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-emerald-600" size={48} /><p className="font-black text-slate-400 uppercase tracking-widest">تحميل بيانات المستودع...</p></div>
        ) : (
          <>
            <AccordionSection id="general" title="قائمة الأصناف العامة المتوفرة" icon={Package} count={generalList.length} list={generalList} />
            <AccordionSection id="phones" title="قائمة الهواتف الذكية والأجهزة" icon={Smartphone} count={phoneList.length} list={phoneList} />
            <AccordionSection id="outOfStockProducts" title="أصناف نفدت بالكامل" icon={Ban} count={outOfStockProducts.length} list={outOfStockProducts} />
            <AccordionSection id="outOfStockVariants" title="أنواع وموديلات نافدة جزئياً" icon={AlertCircle} count={outOfStockVariants.length} list={outOfStockVariants} />
          </>
        )}
      </div>

      {showQuickAddModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
             <div className="p-8 bg-amber-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Zap size={24} />
                  <h3 className="text-xl font-black">توريد سريع بالباركود</h3>
                </div>
                <button onClick={() => setShowQuickAddModal(false)} className="p-2 bg-white/10 rounded-xl"><X size={20} /></button>
             </div>
             <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">مسح الباركود</label>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="امسح أو اكتب الباركود هنا..." 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-600 font-black text-center" 
                    value={quickAddBarcode} 
                    onChange={(e) => setQuickAddBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">الكمية المراد إضافتها</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-amber-600 font-black text-2xl text-center" 
                    value={quickAddQty} 
                    onChange={(e) => setQuickAddQty(Number(e.target.value))} 
                  />
                </div>
                <button 
                  onClick={handleQuickAdd} 
                  disabled={saving || !quickAddBarcode}
                  className="w-full py-5 bg-amber-600 text-white font-black text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                  <span>تأكيد زيادة الكمية</span>
                </button>
             </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
             <div className="p-8 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4"><div className="p-3 bg-emerald-600 rounded-xl"><PlusCircle size={24} /></div><h3 className="text-xl font-black">{modalMode === 'add' ? 'إضافة صنف جديد للمخزن' : 'تعديل بيانات الصنف'}</h3></div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><X size={20} /></button>
             </div>
             <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex items-center justify-between gap-4">
                   <div><h4 className="font-black text-emerald-900 text-sm">استيراد الأصناف عبر Excel</h4><p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">تحديث المخزون وتجميع الأصناف تلقائياً</p></div>
                   <div className="flex gap-2"><button onClick={() => downloadTemplate('general')} className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm"><FileDown size={18}/></button><button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-emerald-600 text-white font-black rounded-xl text-xs flex items-center gap-2"><UploadCloud size={16} /> رفع الملف</button><input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={(e) => handleImportExcel(e, 'general')} /></div>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-emerald-600 font-black text-sm border-b border-slate-100 pb-2"><Info size={18}/> قسم معلومات الصنف</div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase">اسم الصنف</label><input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-emerald-600" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase">القسم الرئيسي</label><select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none" value={form.category_id} onChange={(e) => setForm({...form, category_id: e.target.value, sub_category_id: ''})}><option value="">-- اختر القسم --</option>{mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase">القسم الفرعي</label><select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none" value={form.sub_category_id} onChange={(e) => setForm({...form, sub_category_id: e.target.value})}><option value="">-- بدون --</option>{categories.filter(c => c.parent_id === form.category_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 text-blue-600 font-black text-sm"><Layers size={18}/> قسم أنواع الصنف</div>
                      <button onClick={() => setForm({...form, variants: [...form.variants, { id: undefined, name: '', barcode: '', supplier: '', manufacturer: '', cost_price: 0, sale_price: 0, suggested_discount: 0, stock_quantity: 0 }]})} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] hover:bg-blue-100 transition-all">+ إضافة نوع إضافي</button>
                   </div>
                   <div className="space-y-3">
                      {form.variants.map((v, idx) => (
                        <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                           <input placeholder="النوع" className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-black" value={v.name} onChange={(e) => { const n = [...form.variants]; n[idx].name = e.target.value; setForm({...form, variants: n}); }} />
                           <input placeholder="الباركود" className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-black" value={v.barcode} onChange={(e) => { const n = [...form.variants]; n[idx].barcode = e.target.value; setForm({...form, variants: n}); }} />
                           <input placeholder="المورد" className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-black" value={v.supplier} onChange={(e) => { const n = [...form.variants]; n[idx].supplier = e.target.value; setForm({...form, variants: n}); }} />
                           <input placeholder="الشركة" className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-black" value={v.manufacturer} onChange={(e) => { const n = [...form.variants]; n[idx].manufacturer = e.target.value; setForm({...form, variants: n}); }} />
                           <input type="number" placeholder="تكلفة" className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-black" value={v.cost_price || ''} onChange={(e) => { const n = [...form.variants]; n[idx].cost_price = Number(e.target.value); setForm({...form, variants: n}); }} />
                           <input type="number" placeholder="بيع" className="p-3 bg-emerald-50 text-emerald-700 border-emerald-100 rounded-xl text-xs font-black" value={v.sale_price || ''} onChange={(e) => { const n = [...form.variants]; n[idx].sale_price = Number(e.target.value); setForm({...form, variants: n}); }} />
                           <input type="number" placeholder="خصم" className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-black" value={v.suggested_discount || ''} onChange={(e) => { const n = [...form.variants]; n[idx].suggested_discount = Number(e.target.value); setForm({...form, variants: n}); }} />
                           <input type="number" placeholder="كمية" className="p-3 bg-blue-50 text-blue-700 border-blue-100 rounded-xl text-xs font-black" value={v.stock_quantity || ''} onChange={(e) => { const n = [...form.variants]; n[idx].stock_quantity = Number(e.target.value); setForm({...form, variants: n}); }} />
                           {form.variants.length > 1 && <button onClick={() => setForm({...form, variants: form.variants.filter((_, i) => i !== idx)})} className="absolute -top-2 -left-2 w-8 h-8 bg-white text-rose-500 rounded-full shadow-md flex items-center justify-center border border-rose-100 hover:bg-rose-50 transition-colors"><Trash2 size={12}/></button>}
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <div className="p-8 bg-slate-50 border-t shrink-0">
                <button onClick={handleSaveProduct} disabled={saving} className="w-full py-5 bg-emerald-600 text-white font-black text-xl rounded-[1.8rem] shadow-2xl flex items-center justify-center gap-3 transition-all hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin" /> : <Save />} <span>حفظ وتأكيد الصنف</span>
                </button>
             </div>
          </div>
        </div>
      )}

      {showPhoneModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[250] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
             <div className="p-8 bg-blue-600 text-white flex items-center justify-between shrink-0"><div className="flex items-center gap-4"><div className="p-3 bg-white/20 rounded-xl"><Smartphone size={24} /></div><h3 className="text-xl font-black">توريد الهواتف الذكية</h3></div><button onClick={() => setShowPhoneModal(false)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"><X size={20} /></button></div>
             <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-center justify-between gap-4">
                   <div><h4 className="font-black text-blue-900 text-sm">استيراد الهواتف عبر Excel</h4><p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">رفع وتجميع الموديلات تلقائياً</p></div>
                   <div className="flex gap-2"><button onClick={() => downloadTemplate('phone')} className="p-3 bg-white text-blue-600 rounded-xl shadow-sm"><FileDown size={18}/></button><button onClick={() => phoneImportRef.current?.click()} className="px-6 py-3 bg-blue-600 text-white font-black rounded-xl text-xs flex items-center gap-2"><UploadCloud size={16} /> رفع ملف الهواتف</button><input type="file" ref={phoneImportRef} className="hidden" accept=".xlsx, .xls" onChange={(e) => handleImportExcel(e, 'phone')} /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase tracking-widest">نوع الجهاز / الموديل</label><input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-blue-600" placeholder="e.g. iPhone 15 Pro Max" value={phoneForm.model} onChange={(e) => setPhoneForm({...phoneForm, model: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase tracking-widest">شركة التصنيع</label><input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none focus:border-blue-600" placeholder="e.g. Apple" value={phoneForm.manufacturer} onChange={(e) => setPhoneForm({...phoneForm, manufacturer: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase tracking-widest">القسم الرئيسي</label><input className="w-full p-4 bg-slate-100 border-2 border-slate-100 rounded-2xl font-black text-sm opacity-60 cursor-not-allowed" value="الهواتف" readOnly /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase tracking-widest">القسم الفرعي</label><select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none" value={phoneForm.sub_category_id} onChange={(e) => setPhoneForm({...phoneForm, sub_category_id: e.target.value})}><option value="">-- اختر --</option>{categories.filter(c => c.parent_id === phoneCatId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                      </div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase tracking-widest">المساحة / السعة</label><input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none" placeholder="256GB" value={phoneForm.capacity} onChange={(e) => setPhoneForm({...phoneForm, capacity: e.target.value})} /></div>
                   </div>
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase tracking-widest">التكلفة (₪)</label><input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm text-center" value={phoneForm.cost_price || ''} onChange={(e) => setPhoneForm({...phoneForm, cost_price: Number(e.target.value)})} /></div>
                         <div className="space-y-1"><label className="text-[10px] font-black text-emerald-600 mr-1 uppercase tracking-widest">البيع (₪)</label><input type="number" className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-2xl font-black text-sm text-center" value={phoneForm.sale_price || ''} onChange={(e) => setPhoneForm({...phoneForm, sale_price: Number(e.target.value)})} /></div>
                      </div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 mr-1 uppercase tracking-widest">الخصم المقترح (₪)</label><input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm text-center" value={phoneForm.suggested_discount || ''} onChange={(e) => setPhoneForm({...phoneForm, suggested_discount: Number(e.target.value)})} /></div>
                      <div className="space-y-3 pt-2">
                         <div className="flex items-center justify-between px-1"><label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">أرقام IMEI (كل رقم = قطعة)</label><button onClick={() => setPhoneForm({...phoneForm, imeis: [...phoneForm.imeis, '']})} className="text-[10px] font-black text-blue-600 hover:underline">+ إضافة IMEI آخر</button></div>
                         <div className="grid grid-cols-1 gap-2">
                            {phoneForm.imeis.map((imei, i) => (
                              <div key={i} className="relative group animate-in slide-in-from-right-2 duration-200">
                                 <input className="w-full p-4 bg-white border-2 border-blue-50 rounded-2xl font-black text-xs text-left font-mono" dir="ltr" placeholder={`IMEI / Serial #${i+1}`} value={imei} onChange={(e) => { const n = [...phoneForm.imeis]; n[i] = e.target.value; setPhoneForm({...phoneForm, imeis: n}); }} />
                                 {phoneForm.imeis.length > 1 && <button onClick={() => setPhoneForm({...phoneForm, imeis: phoneForm.imeis.filter((_, idx) => idx !== i)})} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>}
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             <div className="p-8 bg-slate-50 border-t shrink-0">
                <button onClick={handleSavePhone} disabled={saving} className="w-full py-5 bg-blue-600 text-white font-black text-xl rounded-[1.8rem] shadow-2xl flex items-center justify-center gap-3 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50">
                   {saving ? <Loader2 className="animate-spin" /> : <Save />} <span>حفظ وتوريد الهواتف</span>
                </button>
             </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-sm overflow-hidden p-10 space-y-6 text-center animate-in zoom-in duration-200 border border-slate-100">
            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse"><AlertTriangle size={50} /></div>
            <div><h3 className="text-2xl font-black text-slate-900 tracking-tight">تأكيد حذف البيانات</h3><p className="text-slate-500 text-sm mt-2 font-bold leading-relaxed">{deleteTarget.type === 'bulk' ? `سيتم حذف ${selectedIds.length} صنف نهائياً من المستودع.` : deleteTarget.type === 'all' ? 'تحذير: سيتم مسح كافة محتويات المخزون تماماً!' : 'سيتم مسح الصنف المختار من السجلات نهائياً.'} هل أنت متأكد من المتابعة؟</p></div>
            <div className="flex gap-3">
              <button onClick={async () => {
                 setSaving(true);
                 if (deleteTarget.type === 'bulk') await supabase.from('products').delete().in('id', selectedIds);
                 else if (deleteTarget.type === 'all') await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                 else await supabase.from('products').delete().eq('id', deleteTarget.id);
                 setSelectedIds([]); fetchData(); setShowDeleteConfirm(false); setSaving(false);
              }} className="flex-1 py-5 bg-rose-600 text-white font-black rounded-2xl shadow-xl hover:bg-rose-700 active:scale-95 transition-all">نعم، حذف نهائي</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-black rounded-2xl transition-all hover:bg-slate-200">إلغاء وتراجع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;