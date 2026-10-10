import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag,
  X,
  CheckCircle2,
  Loader2,
  PlusCircle,
  Layers,
  Printer,
  LayoutGrid,
  Tag,
  AlertTriangle,
  Zap,
  Save,
  ChevronLeft,
  Scissors,
  Monitor,
  Cable,
  Plug,
  Headphones,
  Car,
  Maximize,
  Box,
  Smartphone,
  Battery,
  Watch,
  Package,
  Info,
  Wrench,
  Cog,
  Cpu
} from 'lucide-react';
import { supabase } from '../supabase';
import type { Variant, Category, ExtraService } from '../types';
import { printThermalReceipt } from '../utils/printThermal';
import { playScanBeep } from '../utils/audio';

interface ExtendedExtraService extends ExtraService {
  service_type: 'صيانة' | 'خدمة' | 'أجهزة' | '';
}

const POS: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMainCat, setSelectedMainCat] = useState<string | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);
  
  const [isCartOpen, setIsCartOpen] = useState(window.innerWidth > 1024);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [limitError, setLimitError] = useState<string | null>(null);
  const [highlightVariantId, setHighlightVariantId] = useState<string | null>(null);

  const [cart, setCart] = useState<any[]>(() => {
    const saved = localStorage.getItem('flyyti_current_cart');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [discount, setDiscount] = useState<number | string>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  
  const [extraService, setExtraService] = useState<ExtendedExtraService>({ 
    name: '', 
    cost_price: 0, 
    sale_price: 0, 
    quantity: 1,
    service_type: 'خدمة'
  });

  const syncChannel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    syncChannel.current = new BroadcastChannel('flyyti_pos_sync');
    return () => {
      syncChannel.current?.close();
    };
  }, []);

  useEffect(() => {
    syncChannel.current?.postMessage({ 
      type: 'SYNC_CART', 
      payload: { cart, discount: Number(discount) || 0 } 
    });
  }, [cart, discount]);

  const openCustomerDisplay = () => {
    const url = window.location.pathname + '#/customer-view';
    window.open(url, 'CustomerDisplay', 'width=1200,height=800,menubar=no,status=no,toolbar=no');
  };

  const fetchData = async () => {
    const { data: prods } = await supabase.from('products').select('*, variants(*)');
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    setProducts(prods || []);
    setCategories(cats || []);
  };

  useEffect(() => {
    fetchData();
    const handleResize = () => {
      if (window.innerWidth > 1024) setIsCartOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (showSuccess) {
      timer = setTimeout(() => {
        setShowSuccess(false);
      }, 20000);
    }
    return () => clearTimeout(timer);
  }, [showSuccess]);

  useEffect(() => {
    localStorage.setItem('flyyti_current_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((variant: Variant, product: any) => {
    const existingInCart = cart.find(item => item.variant_id === variant.id);
    const currentQty = existingInCart ? existingInCart.quantity : 0;

    if (currentQty + 1 > variant.stock_quantity) {
      setLimitError("لا يمكن إضافة أكثر من الكمية المتوفرة");
      setHighlightVariantId(variant.id);
      setTimeout(() => { setLimitError(null); setHighlightVariantId(null); }, 2000);
      return;
    }

    playScanBeep();
    setIsCartOpen(true);
    
    setCart(prev => {
      const existing = prev.find(item => item.variant_id === variant.id);
      if (existing) {
        return prev.map(item => 
          item.variant_id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { 
        variant_id: variant.id, 
        product_name: product.name, 
        variant_name: variant.name, 
        cost_price: variant.cost_price, 
        sale_price: variant.sale_price, 
        suggested_discount: variant.suggested_discount || 0,
        quantity: 1, 
        type: 'product',
        stock_quantity: variant.stock_quantity
      }];
    });
    setSelectedProductForVariants(null);
  }, [cart]);

  const addExtraServiceToCart = () => {
    if (!extraService.name || extraService.sale_price <= 0) return;
    
    setCart(prev => [...prev, {
      variant_id: `service-${Date.now()}`,
      product_name: extraService.name,
      variant_name: 'خدمة سريعة',
      service_type: extraService.service_type, // حفظ النوع في السلة
      cost_price: extraService.cost_price,
      sale_price: extraService.sale_price,
      suggested_discount: 0,
      quantity: extraService.quantity,
      type: 'service'
    }]);
    setExtraService({ name: '', cost_price: 0, sale_price: 0, quantity: 1, service_type: 'خدمة' });
    setShowExtraModal(false);
    setIsCartOpen(true);
  };

  const handleFinishOrder = useCallback(async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    try {
      const { data: lastInvoices } = await supabase
        .from('invoices')
        .select('id')
        .filter('id', 'like', 'fly%')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextInvoiceId = 'fly100001';
      if (lastInvoices && lastInvoices.length > 0) {
        const lastId = lastInvoices[0].id;
        const lastNum = parseInt(lastId.replace('fly', ''), 10);
        if (!isNaN(lastNum)) {
          nextInvoiceId = `fly${lastNum + 1}`;
        }
      }

      const subtotal = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
      const discNum = Number(discount) || 0;
      const netAmount = Math.max(0, subtotal - discNum);
      const totalCost = cart.reduce((sum, item) => sum + (item.cost_price * item.quantity), 0);
      
      const { data: invoice, error: invError } = await supabase.from('invoices').insert({
        id: nextInvoiceId, 
        total_amount: subtotal, 
        discount: discNum, 
        net_amount: netAmount, 
        total_cost: totalCost, 
        profit: netAmount - totalCost
      }).select().single();

      if (invError) throw invError;
      
      const items = cart.filter(c => c.type === 'product');
      const services = cart.filter(c => c.type === 'service');

      if (items.length > 0) {
        await supabase.from('invoice_items').insert(items.map(item => ({
          id: crypto.randomUUID(),
          invoice_id: invoice.id, 
          variant_id: item.variant_id, 
          product_name: item.product_name, 
          variant_name: item.variant_name, 
          quantity: item.quantity, 
          cost_price: item.cost_price, 
          sale_price: item.sale_price
        })));
        for (const item of items) {
          const { data: v } = await supabase.from('variants').select('stock_quantity').eq('id', item.variant_id).single();
          if (v) await supabase.from('variants').update({ stock_quantity: v.stock_quantity - item.quantity }).eq('id', item.variant_id);
        }
      }
      if (services.length > 0) {
        await supabase.from('extra_services').insert(services.map(ser => ({
          id: crypto.randomUUID(),
          invoice_id: invoice.id, 
          name: ser.product_name, 
          service_type: ser.service_type || 'خدمة', 
          cost_price: ser.cost_price, 
          sale_price: ser.sale_price, 
          quantity: ser.quantity
        })));
      }

      setLastInvoice({ ...invoice, invoice_items: items, extra_services: services });
      
      // Trigger Telegram Notification (Async, Fire-and-forget)
      fetch('/api/notify-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id })
      }).catch(err => console.error("Telegram notify failed", err));

      setCart([]);
      setDiscount(0);
      localStorage.removeItem('flyyti_current_cart');
      setIsCartOpen(false);
      setShowSuccess(true);
      fetchData();
    } catch (e) { 
      console.error(e);
      alert("خطأ في إتمام الطلب."); 
    } finally { 
      setIsProcessing(false); 
    }
  }, [cart, discount, isProcessing]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (e.key === '+' || e.code === 'NumpadAdd') {
        if (!isInInput || target === searchInputRef.current) {
          e.preventDefault();
          handleFinishOrder();
        }
      }
      if (e.key.length === 1 && !isInInput && !e.ctrlKey && !e.altKey && !e.metaKey) {
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFinishOrder]);

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length > 2) {
      const barcodeMatch = products.flatMap(p => p.variants.map((v: any) => ({ product: p, variant: v })))
                                   .find(item => item.variant.barcode === trimmed);
      if (barcodeMatch) {
        addToCart(barcodeMatch.variant, barcodeMatch.product);
        setSearchTerm('');
      }
    }
  }, [searchTerm, products, addToCart]);

  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    const size = 32;
    if (n.includes('cable')) return <Cable size={size} />;
    if (n.includes('charger')) return <Plug size={size} />;
    if (n.includes('audio')) return <Headphones size={size} />;
    if (n.includes('car')) return <Car size={size} />;
    if (n.includes('screen')) return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 10a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-2a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1" />
      </svg>
    );
    if (n.includes('case')) return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <rect x="13" y="6" width="3" height="4" rx="1" />
      </svg>
    );
    if (n.includes('phone')) return <Smartphone size={size} />;
    if (n.includes('power bank')) return <Battery size={size} />;
    if (n.includes('watch')) return <Watch size={size} />;
    if (n.includes('other')) return <Package size={size} />;
    return <Tag size={size} />;
  };

  const mainCategories = useMemo(() => {
    const main = categories.filter(c => !c.parent_id);
    const order = ['cable', 'charger', 'audio', 'car', 'screen', 'case', 'other', 'phone', 'power bank', 'watch'];
    return [...main].sort((a, b) => {
      const idxA = order.findIndex(o => a.name.toLowerCase().includes(o));
      const idxB = order.findIndex(o => b.name.toLowerCase().includes(o));
      if (idxA === -1 && idxB === -1) return a.name.localeCompare(b.name);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [categories]);

  const subCategories = useMemo(() => {
    if (!selectedMainCat) return [];
    return categories.filter(c => c.parent_id === selectedMainCat);
  }, [categories, selectedMainCat]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const hasStock = p.variants?.some((v: any) => v.stock_quantity > 0);
      if (!hasStock) return false;
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.variants?.some((v: any) => v.barcode && v.barcode.includes(searchTerm));
      const matchMainCat = selectedMainCat ? p.category_id === selectedMainCat : true;
      const matchSubCat = selectedSubCat ? p.sub_category_id === selectedSubCat : true;
      return matchSearch && matchMainCat && matchSubCat;
    });
  }, [products, searchTerm, selectedMainCat, selectedSubCat]);

  const subtotal = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  const totalSuggestedDiscount = cart.reduce((sum, item) => sum + ((item.suggested_discount || 0) * item.quantity), 0);
  const enteredDiscount = Number(discount) || 0;
  const netAmount = Math.max(0, subtotal - enteredDiscount);

  const getDiscountFieldStyle = () => {
    if (cart.length === 0) return "bg-slate-50 border-slate-100 text-slate-400";
    if (enteredDiscount === totalSuggestedDiscount) return "bg-emerald-50 border-emerald-200 text-emerald-600 focus:border-emerald-500";
    if (enteredDiscount < totalSuggestedDiscount) return "bg-blue-50 border-blue-200 text-blue-600 focus:border-blue-500";
    return "bg-rose-50 border-rose-200 text-rose-600 focus:border-rose-500";
  };

  return (
    <div className="flex h-full font-['Tajawal'] bg-[#f8fafc] overflow-hidden relative" dir="rtl">
      {limitError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 font-black border-2 border-rose-400">
           <AlertTriangle size={20} /> {limitError}
        </div>
      )}

      <aside className="hidden md:flex w-32 lg:w-44 bg-white border-l border-slate-200 flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col items-center gap-1">
          <LayoutGrid size={24} className="text-slate-400" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">الأقسام</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
          <button 
            onClick={() => { setSelectedMainCat(null); setSelectedSubCat(null); }}
            className={`w-full aspect-square rounded-3xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${!selectedMainCat ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-200'}`}
          >
            <LayoutGrid size={32} />
            <div className="font-black text-sm">الكل</div>
          </button>
          {mainCategories.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => { setSelectedMainCat(cat.id); setSelectedSubCat(null); }}
              className={`w-full aspect-square rounded-3xl p-2 flex flex-col items-center justify-center gap-2 transition-all border-2 ${selectedMainCat === cat.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-500 hover:border-slate-200'}`}
            >
              {getCategoryIcon(cat.name)}
              <span className="font-black text-xs lg:text-sm text-center leading-tight line-clamp-2">{cat.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-hidden">
        <div className="bg-white p-4 sm:p-6 border-b border-slate-200 shadow-sm shrink-0">
          <div className="flex flex-col xl:flex-row gap-4">
            <div className="relative flex-1">
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="ابحث بالاسم أو امسح الباركود..." 
                className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={openCustomerDisplay}
                title="فتح شاشة الزبون"
                className="p-4 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl shadow-sm hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center active:scale-95"
              >
                <Monitor size={24} />
              </button>
              <button 
                onClick={() => setShowExtraModal(true)}
                className="flex-1 xl:flex-none px-6 py-4 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all"
              >
                <PlusCircle size={18} />
                <span className="whitespace-nowrap">خدمة سريعة</span>
              </button>
              <button 
                onClick={() => setIsCartOpen(!isCartOpen)}
                className={`p-4 rounded-2xl shadow-lg relative transition-all active:scale-95 flex items-center gap-2 font-black ${isCartOpen ? 'bg-emerald-600 text-white' : 'bg-white border-2 border-slate-200 text-slate-600'}`}
              >
                <ShoppingBag size={24} />
                {cart.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">{cart.length}</span>}
              </button>
            </div>
          </div>
        </div>

        {selectedMainCat && subCategories.length > 0 && (
          <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center gap-4 overflow-x-auto no-scrollbar shrink-0">
            <button 
              onClick={() => setSelectedSubCat(null)}
              className={`px-8 py-4 rounded-2xl text-base font-black whitespace-nowrap transition-all border-2 ${!selectedSubCat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'}`}
            >
              عرض الكل
            </button>
            {subCategories.map(sub => (
              <button 
                key={sub.id} 
                onClick={() => setSelectedSubCat(sub.id)}
                className={`px-10 py-5 rounded-2xl text-base font-black whitespace-nowrap transition-all border-2 ${selectedSubCat === sub.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl scale-105' : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'}`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/30">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filteredProducts.map(p => {
              const activeVariants = p.variants?.filter((v: any) => v.stock_quantity > 0) || [];
              const mainVariant = activeVariants[0];
              return (
                <button 
                  key={p.id} 
                  onClick={() => activeVariants.length === 1 ? addToCart(mainVariant, p) : setSelectedProductForVariants(p)}
                  className="bg-white p-4 rounded-2xl border-2 border-emerald-500 transition-all flex flex-col gap-2 group active:scale-95 text-right relative overflow-hidden aspect-square shadow-sm hover:shadow-md"
                >
                  <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 p-4">
                    <div className="text-2xl font-black">{Math.round(mainVariant?.sale_price || 0)} <span className="text-sm">₪</span></div>
                    <div className="mt-2 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-black uppercase bg-white/20 px-3 py-1 rounded-full border border-white/20">
                        {activeVariants.length > 1 ? `${activeVariants.length} أنواع` : `المتوفر: ${mainVariant?.stock_quantity}`}
                      </span>
                      <div className="mt-4 p-2 bg-white/10 rounded-full border border-white/30">
                        <Plus size={20} />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col h-full">
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="font-black text-slate-800 text-base sm:text-lg leading-tight line-clamp-3 text-center mb-1">{p.name}</h3>
                      <p className="text-[9px] text-slate-400 font-bold text-center tracking-tighter opacity-60">
                        {mainVariant?.barcode || '---'}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-50 flex justify-center">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-100 group-hover:bg-emerald-500 transition-colors"></span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`fixed lg:relative inset-y-0 left-0 z-[110] lg:z-10 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shadow-2xl lg:shadow-none ${isCartOpen ? 'w-[350px] sm:w-[450px] lg:w-[480px] xl:w-[550px]' : 'w-0 opacity-0 pointer-events-none'}`}>
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <ShoppingBag className="text-emerald-500" size={28} />
            <div>
              <h3 className="font-black text-xl">فاتورة البيع</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Current Transaction</p>
            </div>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all lg:hidden"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
              <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center">
                <ShoppingBag size={48} className="text-slate-400" />
              </div>
              <p className="font-black text-lg text-slate-500 uppercase">السلة فارغة</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="bg-white p-2 px-3 rounded-xl border border-slate-200 transition-all shadow-sm group hover:border-emerald-400 flex items-center justify-between gap-3 min-h-[70px]">
                <div className="flex-1 min-w-0 text-right">
                  <h4 className="font-black text-slate-900 text-lg sm:text-xl leading-tight truncate" title={item.product_name}>{item.product_name}</h4>
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    <span className="text-[11px] font-black text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded truncate border border-slate-200">
                      {item.variant_name}
                    </span>
                    {item.suggested_discount > 0 && (
                      <span className="text-[12px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded border-2 border-amber-200 flex items-center gap-1 shrink-0 shadow-sm">
                        <Scissors size={12} /> {Math.round(item.suggested_discount * item.quantity)} ₪
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button onClick={() => {
                        const product = products.find(p => p.name === item.product_name);
                        const variant = product?.variants.find((v: any) => v.id === item.variant_id);
                        if (variant) addToCart(variant, product);
                    }} className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm active:scale-90 text-slate-600 hover:text-emerald-600 transition-colors">
                      <Plus size={14} />
                    </button>
                    <span className="w-6 text-center font-black text-xs">{item.quantity}</span>
                    <button onClick={() => setCart(prev => prev.map((it, i) => i === idx ? {...it, quantity: Math.max(1, it.quantity - 1)} : it))} className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm active:scale-90 text-slate-600 hover:text-rose-600 transition-colors">
                      <Minus size={14} />
                    </button>
                  </div>
                  <div className="text-left min-w-[50px]">
                    <span className="font-black text-emerald-600 text-base block">{Math.round(item.sale_price * item.quantity)} ₪</span>
                  </div>
                  <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 shrink-0">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-5 bg-white border-t border-slate-100 space-y-3 shrink-0 shadow-lg mt-auto z-20">
          <div className="space-y-1">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي الأصناف</span>
              <span className="font-bold text-slate-600 text-sm">{Math.round(subtotal)} ₪</span>
            </div>
            {totalSuggestedDiscount > 0 && (
              <div className="flex justify-between items-center px-1 text-amber-600 mt-1">
                <span className="text-[12px] font-black uppercase tracking-wider">إجمالي الخصم المقترح</span>
                <span className="font-black text-lg">{totalSuggestedDiscount} ₪</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 whitespace-nowrap">الخصم الإضافي (₪)</label>
             <input type="number" className={`w-24 p-2 border-2 rounded-lg font-black text-lg text-center outline-none transition-all shadow-inner ${getDiscountFieldStyle()}`} value={discount || ''} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
          </div>
          <div className="pt-3 border-t border-dashed border-slate-200">
            <div className="flex items-center gap-4">
              <div className="shrink-0 text-right">
                <span className="font-black text-slate-400 text-[10px] uppercase block leading-none mb-1">الإجمالي النهائي</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-emerald-600 tracking-tighter">{Math.round(netAmount)}</span>
                  <span className="text-lg font-black text-emerald-600">₪</span>
                </div>
              </div>
              <button onClick={handleFinishOrder} disabled={cart.length === 0 || isProcessing} className="flex-1 py-4 bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 active:scale-[0.98] hover:bg-emerald-700 transition-all disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={24} /> <span>إتمام عملية البيع</span></>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showExtraModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[220] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-md overflow-hidden animate-in zoom-in duration-200">
             <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-600 rounded-xl"><Zap size={24} /></div>
                  <h3 className="text-xl font-black">إضافة خدمة سريعة</h3>
                </div>
                <button onClick={() => setShowExtraModal(false)} className="p-2 bg-white/10 rounded-xl"><X size={20} /></button>
             </div>
             <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">نوع الخدمة</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'صيانة', icon: Wrench, color: 'emerald' },
                      { id: 'خدمة', icon: Cog, color: 'blue' },
                      { id: 'أجهزة', icon: Cpu, color: 'slate' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setExtraService({ ...extraService, service_type: type.id as any })}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-black text-sm ${
                          extraService.service_type === type.id 
                          ? 'bg-[#0f172a] border-[#0f172a] text-white shadow-xl scale-105' 
                          : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <type.icon size={20} className={extraService.service_type === type.id ? 'text-emerald-400' : 'text-slate-400'} />
                        <span>{type.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">وصف الخدمة</label>
                  <input type="text" placeholder="مثال: تبديل شاشة، تركيب لاصق، إلخ..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-600 font-black" value={extraService.name} onChange={(e) => setExtraService({...extraService, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">التكلفة (₪)</label>
                      <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-emerald-600 font-black text-center" value={extraService.cost_price || ''} onChange={(e) => setExtraService({...extraService, cost_price: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-black text-emerald-600 uppercase tracking-widest px-1">البيع (₪)</label>
                      <input type="number" className="w-full p-4 bg-emerald-50 border-2 border-emerald-100 text-emerald-700 rounded-2xl outline-none focus:border-emerald-600 font-black text-center" value={extraService.sale_price || ''} onChange={(e) => setExtraService({...extraService, sale_price: Number(e.target.value)})} />
                   </div>
                </div>
                <button onClick={addExtraServiceToCart} disabled={!extraService.name || extraService.sale_price <= 0 || !extraService.service_type} className="w-full py-5 bg-emerald-600 text-white font-black text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                  <Save size={20} /> إضافة للسلة
                </button>
             </div>
          </div>
        </div>
      )}

      {selectedProductForVariants && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
             <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="p-3 bg-blue-600 rounded-2xl"><Layers size={24} /></div><h3 className="text-xl font-black">{selectedProductForVariants.name}</h3></div>
                <button onClick={() => setSelectedProductForVariants(null)} className="p-2 bg-white/10 rounded-xl"><X size={20} /></button>
             </div>
             <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {selectedProductForVariants.variants?.filter((v: any) => v.stock_quantity > 0).map((v: any) => (
                  <button key={v.id} onClick={() => addToCart(v, selectedProductForVariants)} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl flex items-center justify-between hover:border-emerald-600 transition-all group active:scale-95">
                    <div className="text-right"><p className="font-black text-slate-900 text-sm">{v.name}</p><p className="text-[10px] text-slate-400 font-bold">الرصيد: {v.stock_quantity}</p></div>
                    <span className="font-black text-emerald-600 text-xl">{Math.round(v.sale_price)} ₪</span>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 bg-emerald-600/90 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 text-center animate-in zoom-in duration-300 max-w-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 h-1 bg-emerald-500 animate-[timer_20s_linear_forwards]" style={{ width: '100%' }}></div>
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner animate-bounce"><CheckCircle2 size={64} /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">تم البيع بنجاح!</h2>
              <p className="text-slate-500 font-bold mt-1">رقم الفاتورة: {lastInvoice?.id}</p>
              <p className="text-[10px] text-slate-300 mt-4 uppercase tracking-widest font-black">ستغلق هذه النافذة تلقائياً خلال 20 ثانية</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
               <button onClick={() => lastInvoice && printThermalReceipt(lastInvoice)} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all"><Printer size={20} /><span>طباعة الفاتورة</span></button>
               <button onClick={() => setShowSuccess(false)} className="w-full py-5 bg-slate-100 text-slate-600 font-black rounded-2xl active:scale-95 transition-all">إغلاق الآن</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;