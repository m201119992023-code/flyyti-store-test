import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, Sparkles } from 'lucide-react';

const CustomerView: React.FC = () => {
  const [data, setData] = useState({
    cart: [] as any[],
    discount: 0
  });

  useEffect(() => {
    const channel = new BroadcastChannel('flyyti_pos_sync');
    
    channel.onmessage = (event) => {
      if (event.data.type === 'SYNC_CART') {
        setData(event.data.payload);
      }
    };

    // جلب البيانات الأولية من التخزين المحلي في حال كانت الشاشة قد فتحت للتو
    const savedCart = localStorage.getItem('flyyti_current_cart');
    if (savedCart) {
      setData(prev => ({ ...prev, cart: JSON.parse(savedCart) }));
    }

    return () => channel.close();
  }, []);

  const subtotal = data.cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  const netAmount = Math.max(0, subtotal - data.discount);

  return (
    <div className="h-screen w-full bg-[#0f172a] text-white flex flex-col font-['Tajawal']" dir="rtl">
      {/* Header */}
      <div className="p-8 bg-slate-900/50 border-b border-white/10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-600 rounded-3xl shadow-2xl shadow-emerald-500/20">
            <ShoppingCart size={40} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">مرحباً بك في Flyyti Mobile</h1>
            <p className="text-slate-400 font-bold text-lg mt-1">تأكد من أصناف فاتورتك</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-emerald-500">
           <Sparkles size={24} className="animate-pulse" />
           <span className="font-black text-xl uppercase tracking-widest">Customer Display</span>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {data.cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-pulse">
               <div className="w-64 h-64 bg-slate-800/50 rounded-full flex items-center justify-center">
                  <Star size={120} className="text-slate-700" />
               </div>
               <h2 className="text-3xl font-black text-slate-500">نحن في خدمتك دائماً</h2>
            </div>
          ) : (
            <div className="space-y-4">
              <table className="w-full text-right border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-slate-500 font-black text-xl">
                    <th className="pb-4 pr-4">الصنف</th>
                    <th className="pb-4 text-center">الكمية</th>
                    <th className="pb-4 text-left pl-4">المجموع</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cart.map((item, idx) => (
                    <tr key={idx} className="bg-slate-800/50 rounded-3xl overflow-hidden group animate-in slide-in-from-right-4 duration-300">
                      <td className="p-6 rounded-r-3xl">
                        <p className="text-3xl font-black group-hover:text-emerald-400 transition-colors">{item.product_name}</p>
                        <p className="text-lg text-slate-400 font-bold mt-1">{item.variant_name}</p>
                      </td>
                      <td className="p-6 text-center">
                        <span className="inline-block px-8 py-3 bg-slate-900 rounded-2xl text-3xl font-black text-emerald-500">
                          x{item.quantity}
                        </span>
                      </td>
                      <td className="p-6 text-left rounded-l-3xl">
                        <span className="text-4xl font-black tracking-tighter">
                          {Math.round(item.sale_price * item.quantity)} <span className="text-xl">₪</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Side */}
        <div className="w-[450px] bg-slate-900 p-10 border-r border-white/5 flex flex-col justify-between shrink-0">
          <div className="space-y-10">
            <div className="space-y-6">
               <div className="flex justify-between items-center text-slate-300 font-black text-3xl">
                  <span>إجمالي الأصناف</span>
                  <span className="text-white">{Math.round(subtotal)} ₪</span>
               </div>
               
               {data.discount > 0 && (
                 <div className="flex justify-between items-center text-rose-500 font-black text-4xl animate-in slide-in-from-top-2 duration-300">
                    <span>قيمة الخصم</span>
                    <span>{Math.round(data.discount)} ₪-</span>
                 </div>
               )}
            </div>

            <div className="p-8 bg-emerald-600/10 border-2 border-emerald-500/20 rounded-[3rem] text-center space-y-2 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <p className="text-emerald-500 font-black text-xl uppercase tracking-widest">المبلغ المطلوب</p>
               <div className="flex items-baseline justify-center gap-2">
                  <span className="text-9xl font-black tracking-tighter text-emerald-500">{Math.round(netAmount)}</span>
                  <span className="text-4xl font-black text-emerald-500">₪</span>
               </div>
            </div>
          </div>

          <div className="text-center space-y-4 opacity-50">
             <div className="flex items-center justify-center gap-3">
                <div className="h-px bg-slate-700 flex-1"></div>
                <p className="font-black text-sm uppercase tracking-[0.3em]">Flyyti POS System</p>
                <div className="h-px bg-slate-700 flex-1"></div>
             </div>
             <p className="text-slate-400 font-bold">شكراً لزيارتكم، نتمنى لكم يوماً سعيداً ❤</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerView;
