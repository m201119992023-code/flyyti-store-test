
import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Shield, 
  User, 
  Key, 
  Save, 
  ShieldOff, 
  Unlock,
  Settings,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCheck,
  RefreshCw,
  Fingerprint,
  Layout,
  ShoppingCart,
  LayoutDashboard,
  Package,
  Tags,
  Wallet,
  FileText,
  PieChart,
  Users
} from 'lucide-react';
import { supabase } from '../supabase';
import type { AppSettings } from '../types';

const Security: React.FC<{ settings: AppSettings | null, onUpdate: () => void }> = ({ settings, onUpdate }) => {
  const [form, setForm] = useState({
    username: settings?.username || '',
    password: '',
    confirmPassword: '',
    page_password: settings?.page_password || '',
  });
  
  const [locks, setLocks] = useState<Record<string, boolean>>(settings?.page_locks || {});
  const [protectionEnabled, setProtectionEnabled] = useState(settings?.protection_enabled ?? true);
  const [loginProtectionEnabled, setLoginProtectionEnabled] = useState(settings?.login_protection_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // قائمة بكافة صفحات النظام - IDs موحدة مع App.tsx
  const allPages = [
    { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart },
    { id: 'daily_reports', label: 'التقارير اليومية', icon: LayoutDashboard },
    { id: 'inventory', label: 'المخزون', icon: Package },
    { id: 'categories', label: 'التصنيفات', icon: Tags },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'expenses', label: 'المصاريف', icon: Wallet },
    { id: 'invoices', label: 'سجل الفواتير', icon: FileText },
    { id: 'reports', label: 'التقارير المالية', icon: PieChart },
    { id: 'security', label: 'إعدادات النظام', icon: Settings },
  ];

  useEffect(() => {
    if (settings) {
      setForm({
        username: settings.username || '',
        password: '',
        confirmPassword: '',
        page_password: settings.page_password || '',
      });
      setLocks(settings.page_locks || {});
      setProtectionEnabled(settings.protection_enabled);
      setLoginProtectionEnabled(settings.login_protection_enabled);
    }
  }, [settings]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      alert("كلمات المرور غير متطابقة");
      return;
    }

    setSaving(true);
    try {
      const updateData: any = { username: form.username, page_password: form.page_password };
      if (form.password) updateData.password = form.password;

      const { error } = await supabase.from('settings').update(updateData).eq('id', 1);
      if (error) throw error;
      
      onUpdate();
      alert("تم تحديث إعدادات النظام بنجاح");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الحفظ.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (pageId: string) => {
    const newLocks = { ...locks, [pageId]: !locks[pageId] };
    setLocks(newLocks);
    await supabase.from('settings').update({ page_locks: newLocks }).eq('id', 1);
    onUpdate();
  };

  const handleToggleProtection = async () => {
    const newVal = !protectionEnabled;
    setProtectionEnabled(newVal);
    await supabase.from('settings').update({ protection_enabled: newVal }).eq('id', 1);
    onUpdate();
  };

  const handleToggleLoginProtection = async () => {
    try {
      const newVal = !loginProtectionEnabled;
      setLoginProtectionEnabled(newVal);
      const { error } = await supabase.from('settings').update({ login_protection_enabled: newVal }).eq('id', 1);
      if (error) {
        setLoginProtectionEnabled(!newVal);
        throw error;
      }
      onUpdate();
    } catch (err) {
      console.error(err);
      alert("فشل تحديث أمان الدخول.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar font-['Tajawal'] pb-20" dir="rtl">
      
      {/* Security Header */}
      <div className="p-8 md:p-14 bg-[#0f172a] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
          <div className="flex items-center gap-8">
            <div className={`p-6 rounded-[2.5rem] shadow-2xl transition-all ${loginProtectionEnabled ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-slate-700 shadow-none'}`}>
              <ShieldCheck size={54} className={loginProtectionEnabled ? 'text-white' : 'text-slate-400'} />
            </div>
            <div>
              <h2 className="text-4xl font-black tracking-tight mb-2">منظومة الأمان الذكي</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                {loginProtectionEnabled ? 'حماية الدخول الرئيسية: مفعلة' : 'حماية الدخول الرئيسية: معطلة'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleToggleLoginProtection}
            className={`flex items-center gap-5 px-10 py-6 rounded-[2.2rem] font-black transition-all shadow-2xl active:scale-95 border-2 ${loginProtectionEnabled ? 'bg-white text-[#0f172a] border-white' : 'bg-transparent text-white border-white/20 hover:border-white'}`}
          >
            {loginProtectionEnabled ? <Fingerprint size={24} /> : <Unlock size={24} />}
            <span>{loginProtectionEnabled ? 'تعطيل قفل النظام' : 'تفعيل قفل النظام'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-6 space-y-10">
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-10 bg-[#0f172a] flex items-center justify-between">
              <div className="flex items-center gap-5"><UserCheck size={28} className="text-emerald-500"/><h3 className="text-2xl font-black text-white">بيانات الدخول</h3></div>
            </div>
            <form onSubmit={handleSaveCredentials} className="p-10 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase">اسم المسؤول</label>
                  <input type="text" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#0f172a] font-bold" value={form.username || ''} onChange={(e) => setForm({...form, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-emerald-600 uppercase">رمز PIN الصفحات</label>
                  <input type="text" maxLength={4} className="w-full p-6 bg-emerald-50 border-2 border-emerald-100 rounded-3xl outline-none focus:border-emerald-600 text-emerald-600 font-black text-3xl tracking-[0.6em] text-center" value={form.page_password || ''} onChange={(e) => setForm({...form, page_password: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <label className="text-[11px] font-black text-slate-500 uppercase">كلمة مرور جديدة</label>
                    <input type={showPass ? "text" : "password"} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#0f172a] font-bold" placeholder="تجاهل لعدم التغيير" value={form.password || ''} onChange={(e) => setForm({...form, password: e.target.value})} />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-4 bottom-4 text-slate-400">{showPass ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase">تأكيد الكلمة</label>
                    <input type={showPass ? "text" : "password"} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-[#0f172a] font-bold" value={form.confirmPassword || ''} onChange={(e) => setForm({...form, confirmPassword: e.target.value})} />
                  </div>
                </div>
              </div>
              <button disabled={saving} type="submit" className="w-full py-6 bg-[#0f172a] text-white font-black text-xl rounded-[2rem] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-5">
                {saving ? <RefreshCw className="animate-spin" size={28} /> : <Save size={28} className="text-emerald-500" />}
                <span>حفظ التعديلات</span>
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-6 space-y-10">
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className="p-8 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl transition-all ${protectionEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-300'}`}><Shield size={26} /></div>
                <div><h3 className="text-xl font-black text-slate-900">حماية الأقسام والواجهات</h3><p className="text-[11px] font-bold text-slate-400">تحكم في تشفير الأقسام برمز PIN</p></div>
              </div>
              <button onClick={handleToggleProtection} className={`relative inline-flex h-9 w-18 items-center rounded-full transition-all ${protectionEnabled ? 'bg-emerald-600' : 'bg-slate-200'}`}>
                <span className={`inline-block h-7 w-7 transform rounded-full bg-white transition-all shadow-lg ${protectionEnabled ? 'translate-x-10' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-2 gap-4 bg-slate-50/50 flex-1">
              {allPages.map(page => {
                const PageIcon = page.icon;
                const isLocked = locks[page.id] && protectionEnabled;
                return (
                  <div key={page.id} className={`p-5 rounded-[2rem] border-2 transition-all flex flex-col gap-4 relative ${isLocked ? 'bg-[#0f172a] border-[#0f172a] shadow-xl translate-y-[-2px]' : 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-xl ${isLocked ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'}`}><PageIcon size={20} /></div>
                      <div className={isLocked ? 'text-emerald-400' : 'text-slate-200'}>{isLocked ? <Lock size={18} /> : <Unlock size={18} />}</div>
                    </div>
                    <div><span className={`font-black text-sm block ${isLocked ? 'text-white' : 'text-slate-800'}`}>{page.label}</span></div>
                    <button disabled={!protectionEnabled} onClick={() => handleToggleLock(page.id)} className={`w-full py-3 rounded-2xl font-black text-[10px] transition-all border ${isLocked ? 'bg-white/10 border-white/10 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white'} ${!protectionEnabled && 'opacity-20'}`}>
                      {locks[page.id] ? 'إلغاء الحماية' : 'تفعيل الحماية'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;
