import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';
import { Package, Plus, Search, Trash2, Pencil, ImagePlus, Save, ArrowRight, ChartNoAxesColumn, ClipboardList, ShieldAlert } from 'lucide-react';

type Section = 'products' | 'orders' | 'reports' | 'settings';
type StockRow = { id: string; name: string; variants?: Array<{id:string;name:string;stock_quantity:number;sale_price:number}> };
type Listing = { id:string; sourceProductId:string; sourceVariantId:string; sourceName:string; name:string; description:string; image:string; price:number; oldPrice:string; warranty:string; published:boolean; stockAtImport:number };
const STORAGE='flyyti-store-admin-drafts-v1';
const input='w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-orange-400';
const initial=():Listing[]=>{try {const v=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
const money=(v:number)=>`₪ ${Number(v||0).toLocaleString('en-US')}`;
export default function StoreManagement({section}:{section:Section}){
 const [list,setList]=useState<Listing[]>(initial);
 const [remoteEnabled,setRemoteEnabled]=useState(false);
 const [remoteBusy,setRemoteBusy]=useState(false);
 const [stock,setStock]=useState<StockRow[]>([]);
 const [stockLoading,setStockLoading]=useState(false);
 const [stockError,setStockError]=useState('');
 const [query,setQuery]=useState('');
 const [showImport,setShowImport]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 useEffect(()=>{if(remoteEnabled)return;try{localStorage.setItem(STORAGE,JSON.stringify(list))}catch{setNotice('تعذّر حفظ البيانات محليًا. استخدم صورًا أصغر أو روابط صور.')}},[list,remoteEnabled]);
 const loadRemote=async()=>{
  setRemoteBusy(true);
  try{
   const {data:auth}=await supabase.auth.getUser();
   if(!auth.user){setNotice('تسجيل دخول Supabase Auth مطلوب لإدارة المنتجات المنشورة.');return}
   const {data:allowed,error:roleError}=await supabase.rpc('is_store_admin');
   if(roleError||!allowed){setNotice('هذا الحساب غير مخوّل لإدارة المتجر، أو لم يتم تطبيق SQL V26.');return}
   const {data,error}=await supabase.from('store_products').select('*').order('created_at',{ascending:false});
   if(error)throw error;
   setList((data||[]).map((x:any)=>({
    id:x.id,sourceProductId:x.source_product_id,sourceVariantId:x.source_variant_id,
    sourceName:'الصنف '+x.source_variant_id,name:x.name,description:x.description||'',
    image:x.image_url||'',price:Number(x.price),oldPrice:x.old_price==null?'':String(x.old_price),
    warranty:x.warranty||'',published:!!x.published,stockAtImport:0
   })));
   setRemoteEnabled(true);setNotice('تم الاتصال بكتالوج المتجر. التعديلات تحتاج حفظًا صريحًا.');
  }catch(e:any){setNotice('تعذّر فتح كتالوج المتجر: '+(e.message||'خطأ'))}
  finally{setRemoteBusy(false)}
 };
 const saveRemote=async(p:Listing)=>{
  if(!remoteEnabled){setNotice('المسودة محفوظة على المتصفح فقط. اتصل بقاعدة المتجر أولًا.');return}
  if(!p.name.trim()||!Number.isFinite(p.price)||p.price<0){setNotice('الاسم والسعر الصحيح مطلوبان.');return}
  if(p.oldPrice&&Number(p.oldPrice)<=p.price){setNotice('السعر قبل الخصم يجب أن يكون أعلى من سعر البيع.');return}
  setRemoteBusy(true);
  try{
   const payload={source_product_id:p.sourceProductId,source_variant_id:p.sourceVariantId,
    name:p.name.trim(),description:p.description,image_url:p.image.startsWith('data:')?'':p.image,
    price:p.price,old_price:p.oldPrice?Number(p.oldPrice):null,warranty:p.warranty,
    published:p.published,updated_at:new Date().toISOString()};
   if(p.image.startsWith('data:')){setNotice('ارفع الصورة إلى استضافة آمنة واستخدم رابطها قبل النشر.');return}
   const {data,error}=await supabase.from('store_products').upsert(payload,{onConflict:'source_variant_id'}).select('id').single();
   if(error)throw error;
   setList(a=>a.map(x=>x.id===p.id?{...x,id:data.id}:x));
   setEditing(null);setNotice('تم حفظ المنتج في Supabase بنجاح.');
  }catch(e:any){setNotice('فشل الحفظ: '+(e.message||'خطأ'))}
  finally{setRemoteBusy(false)}
 };
 const fetchStock=async()=>{
  setStockLoading(true);setStockError('');
  try{
   const {data,error}=await supabase.from('products').select('id,name,variants(id,name,stock_quantity,sale_price)').order('name');
   if(error)throw error;
   setStock((data||[]) as StockRow[]);
  }catch(e:any){setStockError('تعذّر قراءة المخزون: '+(e?.message||'خطأ غير معروف'))}
  finally{setStockLoading(false)}
 };
 const importItem=(p:StockRow,v:NonNullable<StockRow['variants']>[number])=>{
  if(list.some(x=>x.sourceVariantId===v.id)){setNotice('هذا الصنف مستورد بالفعل؛ عدّل بياناته من القائمة.');return}
  const id='draft-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  setList(a=>[{id,sourceProductId:p.id,sourceVariantId:v.id,sourceName:p.name+' — '+v.name,name:p.name,description:'',image:'',price:Number(v.sale_price)||0,oldPrice:'',warranty:'',published:false,stockAtImport:Number(v.stock_quantity)||0},...a]);
  setShowImport(false);setEditing(id);setNotice('تم استيراد بيانات الصنف إلى مسودة المتجر. لن يظهر للزبائن قبل الربط والنشر الحقيقي.');
 };
 const change=(id:string,patch:Partial<Listing>)=>setList(a=>a.map(p=>p.id===id?{...p,...patch}:p));
 const fileImage=(id:string,file?:File)=>{
  if(!file)return;
  if(!file.type.startsWith('image/')){setNotice('اختر ملف صورة فقط');return}
  if(file.size>350000){setNotice('الصورة أكبر من 350KB. استخدم رابط صورة أو صورة مضغوطة؛ التخزين هنا تجريبي.');return}
  const reader=new FileReader();reader.onload=()=>change(id,{image:String(reader.result||'')});reader.readAsDataURL(file);
 };
 const visible=useMemo(()=>list.filter(x=>(x.name+' '+x.sourceName).toLowerCase().includes(query.toLowerCase())),[list,query]);
 const title={products:'منتجات المتجر',orders:'طلبات المتجر',reports:'تقارير المتجر',settings:'إعدادات المتجر'}[section];
 return <main dir="rtl" className="h-full overflow-y-auto bg-[#f8fafc] p-4 md:p-8 text-slate-900" style={{fontFamily:"'Tajawal',sans-serif"}}>
 <div className="mx-auto max-w-6xl space-y-6 pb-16">
 <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-orange-600">Flyyti / إدارة المتجر الإلكتروني</p><h1 className="mt-1 text-2xl md:text-3xl font-black">{title}</h1></div><Link to="/store" className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-bold text-sm">معاينة المتجر <ArrowRight size={17}/></Link></div>
 <nav className="flex flex-wrap gap-2">{([['products','منتجات المتجر'],['orders','الطلبات'],['reports','التقارير'],['settings','الإعدادات']] as const).map(([key,label])=><Link key={key} to={'/store-'+key} className={'rounded-xl px-4 py-2.5 text-sm font-bold '+(section===key?'bg-slate-900 text-white':'bg-white border text-slate-600')}>{label}</Link>)}</nav>
 <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><ShieldAlert size={18} className="inline ml-2"/>لوحة الإدارة قيد التجهيز: مسودات المتصفح لا تنشر منتجات. يتطلب الحفظ الفعلي تنفيذ SQL V26 وتسجيل الدخول بحساب Supabase Auth مصرح له. واجهة الزبائن الحالية لا تزال تعرض منتجات تجريبية؛ لم يتم ربطها بالكتالوج المنشور بعد. لا يتم إنشاء طلبات أو خصم مخزون.</div>
 {notice&&<div role="status" className="rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-900 flex justify-between gap-3">{notice}<button onClick={()=>setNotice('')} aria-label="إغلاق التنبيه">×</button></div>}
 {section==='products'&&<div className="space-y-5">
 <div className="rounded-2xl border bg-white p-4 flex flex-wrap gap-3 items-center justify-between">
 <div><strong>{remoteEnabled?'وضع Supabase — حفظ فعلي':'وضع مسودات المتصفح'}</strong><p className="text-xs text-slate-500 mt-1">يتطلب الوضع الفعلي تنفيذ sql/store_catalog_v26.sql وحساب Supabase Auth بصلاحية مدير متجر.</p></div>
 <button disabled={remoteBusy} onClick={loadRemote} className="rounded-xl bg-slate-900 text-white px-4 py-3 font-bold disabled:opacity-50">{remoteBusy?'انتظر...':'اتصال بكتالوج Supabase'}</button></div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['مسودات المنتجات',list.length],['مفعّلة في المسودة',list.filter(x=>x.published).length],['مخفية',list.filter(x=>!x.published).length],['منشورة فعليًا',0]].map(([label,val])=><div key={label} className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><strong className="text-2xl">{val}</strong></div>)}</div>
 <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex gap-2 items-center bg-white border rounded-xl px-3 flex-1 max-w-md"><Search size={18}/><input className="p-3 outline-none w-full" placeholder="ابحث في منتجات المتجر" value={query} onChange={e=>setQuery(e.target.value)}/></label><button onClick={()=>{setShowImport(true);fetchStock()}} className="bg-[#ff6a00] text-white rounded-xl px-5 py-3 font-black flex gap-2 items-center"><Plus size={18}/> استورد منتج من المخزون</button></div>
 {visible.length===0?<div className="rounded-2xl border bg-white p-12 text-center text-slate-500"><Package size={42} className="mx-auto mb-3"/><p>لا توجد منتجات مطابقة. ابدأ باستيراد صنف من المخزون.</p></div>:<div className="grid gap-4">{visible.map(p=><article key={p.id} className="rounded-2xl border bg-white p-4 md:p-5">
 <div className="flex gap-4 items-start">{p.image?<img src={p.image} alt={p.name} className="h-20 w-20 rounded-xl object-cover border"/>:<div className="h-20 w-20 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400"><ImagePlus/></div>}<div className="flex-1 min-w-0"><div className="flex flex-wrap gap-2 items-center"><h2 className="font-black text-lg">{p.name}</h2><span className={'text-xs rounded-full px-2 py-1 '+(p.published?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500')}>{p.published?'مفعّل بالمسودة':'مخفي بالمسودة'}</span></div><p className="text-xs text-slate-500 mt-1">المصدر: {p.sourceName}</p><p className="font-black mt-2">{money(p.price)} {p.oldPrice&&<s className="text-sm text-slate-400 mr-2">{money(Number(p.oldPrice))}</s>}</p></div><div className="flex gap-2"><button className="p-2 border rounded-lg" aria-label="تعديل" onClick={()=>setEditing(editing===p.id?null:p.id)}><Pencil size={17}/></button><button className="p-2 border rounded-lg" aria-label="حذف" onClick={async()=>{if(!window.confirm('حذف المنتج من القائمة؟'))return;
 if(remoteEnabled&&!p.id.startsWith('draft-')){const {error}=await supabase.from('store_products').delete().eq('id',p.id);if(error){setNotice('فشل الحذف: '+error.message);return}}
 setList(a=>a.filter(x=>x.id!==p.id))}}><Trash2 size={17}/></button></div></div>
 {editing===p.id&&<div className="grid md:grid-cols-2 gap-4 border-t mt-5 pt-5">
 <label className="text-sm font-bold">اسم العرض<input className={input+' mt-2'} value={p.name} onChange={e=>change(p.id,{name:e.target.value})}/></label>
 <label className="text-sm font-bold">سعر البيع (₪)<input type="number" min="0" step="0.01" className={input+' mt-2'} value={p.price} onChange={e=>change(p.id,{price:Number(e.target.value)})}/></label>
 <label className="text-sm font-bold">السعر قبل الخصم — اختياري (₪)<input type="number" min="0" step="0.01" className={input+' mt-2'} value={p.oldPrice} onChange={e=>change(p.id,{oldPrice:e.target.value})}/></label>
 <label className="text-sm font-bold">رابط صورة المنتج<input dir="ltr" className={input+' mt-2'} placeholder="https://..." value={p.image.startsWith('data:')?'':p.image} onChange={e=>change(p.id,{image:e.target.value})}/></label>
 <label className="text-sm font-bold">أو رفع صورة صغيرة (350KB كحد أقصى)<input type="file" accept="image/*" className={input+' mt-2'} onChange={e=>fileImage(p.id,e.target.files?.[0])}/></label>
 <label className="text-sm font-bold">الضمان (اكتب فقط إذا كان المنتج مكفولًا)<input className={input+' mt-2'} value={p.warranty} onChange={e=>change(p.id,{warranty:e.target.value})}/></label>
 <label className="text-sm font-bold md:col-span-2">وصف المنتج<textarea rows={4} className={input+' mt-2'} value={p.description} onChange={e=>change(p.id,{description:e.target.value})}/></label>
 <div className="md:col-span-2 flex flex-wrap gap-3 items-center justify-between"><label className="flex items-center gap-2 font-bold text-sm"><input type="checkbox" checked={p.published} onChange={e=>change(p.id,{published:e.target.checked})}/> إظهار المنتج في كتالوج المتجر (في وضع Supabase فقط)</label><button onClick={()=>remoteEnabled?saveRemote(p):(setEditing(null),setNotice('تم حفظ المسودة في هذا المتصفح فقط.'))} className="flex gap-2 items-center rounded-xl bg-slate-900 px-5 py-3 text-white font-black"><Save size={17}/> حفظ التعديلات</button></div></div>}
 </article>)}</div>}
 </div>}
 {section==='orders'&&<div className="rounded-2xl border bg-white p-8 space-y-3"><ClipboardList className="text-orange-500" size={35}/><h2 className="text-xl font-black">طلبات المتجر</h2><p className="text-slate-600 leading-8">لا توجد طلبات حقيقية بعد. شاشة الطلبات مجهزة كمدخل للإدارة، لكن إتمام الطلب في واجهة المتجر تجريبي ولا يرسل بيانات. سيتم عرض رقم الطلب والزبون والمنتجات ورسوم التوصيل والحالة بعد إنشاء قاعدة طلبات آمنة.</p><p className="font-bold text-sm text-amber-700">0 طلبات مسجلة — لا يتم إنشاء طلبات وهمية.</p></div>}
 {section==='reports'&&<div className="space-y-4"><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['الطلبات الحقيقية',0],['المبيعات المؤكدة',money(0)],['طلبات قيد التجهيز',0],['متوسط قيمة الطلب',money(0)]].map(([label,val])=><div className="rounded-2xl bg-white border p-5" key={label}><p className="text-xs text-slate-500">{label}</p><p className="text-2xl font-black mt-2">{val}</p></div>)}</div><div className="rounded-2xl border bg-white p-8"><ChartNoAxesColumn className="text-orange-500 mb-3"/><h2 className="font-black text-xl">تقارير المتجر</h2><p className="text-slate-500 leading-8 mt-2">لا توجد بيانات طلبات فعلية لعرض مخطط أو أرباح. عند تفعيل الطلبات سنضيف التقارير حسب الفترة، المنطقة، المنتجات الأكثر مبيعًا، وحالة الطلب.</p></div></div>}
 {section==='settings'&&<div className="grid md:grid-cols-2 gap-4">
 {([['الهاتف','0568117126'],['واتساب','+970568117126'],['العنوان','نابلس - راس العين - خلف مدرسة جمال عبد الناصر - عمارة ابو الحيات'],['ساعات العمل','السبت–الخميس 10:00AM–10:00PM'],['الضفة الغربية','20 ₪'],['القدس','35 ₪'],['أراضي 48','80 ₪'],['مدة التوصيل','خلال 3 أيام'],['الاستلام من المحل','متاح'],['الاسترجاع','غير متاح'],['التبديل','خلال 3 أيام مع كرتونة المنتج وفاتورة الطلب'],['الضمان','للمنتجات التي يذكر ضمانها في وصف المنتج فقط']] as const).map(([label,value])=><div className="rounded-2xl border bg-white p-5" key={label}><p className="text-sm text-slate-500">{label}</p><p className="font-black mt-2 leading-7">{value}</p></div>)}
 <p className="md:col-span-2 text-sm text-slate-500">هذه صفحة عرض للإعدادات المعتمدة. التعديل والصلاحيات والمزامنة مع قاعدة البيانات ستُضاف بعد إعداد طبقة إدارة آمنة.</p></div>}
 {showImport&&<div role="dialog" aria-modal="true" aria-label="استيراد من المخزون" className="fixed inset-0 z-[250] bg-black/60 p-4 flex items-center justify-center"><div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-5 md:p-7 space-y-4"><div className="flex justify-between items-center"><h2 className="text-xl font-black">استورد منتج من المخزون</h2><button onClick={()=>setShowImport(false)} className="p-2 text-xl" aria-label="إغلاق">×</button></div><p className="text-sm text-slate-500">قراءة الأصناف الحالية فقط. اختر الصنف ليُضاف كمسودة قابلة لتعديل الاسم والصورة والسعر والوصف.</p>{stockLoading?<p>جارٍ تحميل المخزون...</p>:stockError?<div className="text-red-700">{stockError}<button onClick={fetchStock} className="underline mr-2">إعادة المحاولة</button></div>:stock.length===0?<p>لا توجد منتجات في المخزون.</p>:<div className="space-y-2">{stock.flatMap(p=>(p.variants||[]).map(v=><div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><strong>{p.name}</strong><p className="text-xs text-slate-500">{v.name} · المخزون الحالي: {v.stock_quantity} · {money(v.sale_price)}</p></div><button onClick={()=>importItem(p,v)} className="shrink-0 bg-orange-500 text-white rounded-lg px-3 py-2 text-sm font-black">استيراد</button></div>))}</div>}</div></div>}
 </div></main>;
}
