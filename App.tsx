import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ShoppingBag,
  Package, 
  Tags, 
  Wallet, 
  FileText, 
  PieChart, 
  Menu, 
  X, 
  ShieldCheck,
  Database,
  Lock,
  ShieldAlert,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Settings,
  Users
} from 'lucide-react';
import { supabase, getSupabaseConfig, saveSupabaseConfig } from './supabase';
import type { AppSettings } from './types';

// Pages
import POS from './pages/POS.tsx';
import OnlineStore from './pages/OnlineStore.tsx';
import StoreManagement from './pages/StoreManagement.tsx';
import DailyReports from './pages/DailyReports.tsx';
import Inventory from './pages/Inventory.tsx';
import Categories from './pages/Categories.tsx';
import Expenses from './pages/Expenses.tsx';
import Invoices from './pages/Invoices.tsx';
import GeneralReports from './pages/GeneralReports.tsx';
import Security from './pages/Security.tsx';
import Login from './pages/Login.tsx';
import Customers from './pages/Customers.tsx';
import CustomerView from './pages/CustomerView.tsx';

// Custom Logo Component
const FlyytiLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 20H55V35H35V45H50V60H35V80L20 90V20Z" fill="white" />
    <path d="M45 20L65 50V75H85V90H45V20Z" fill="#FF7A00" />
  </svg>
);

// Full-Screen Authentication Overlay
const PageAuthOverlay: React.FC<{ expectedPin: string, onUnlock: () => void, pageLabel: string }> = ({ expectedPin, onUnlock, pageLabel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password === expectedPin) {
      setTimeout(() => {
        onUnlock();
        setLoading(false);
      }, 300);
    } else {
      setTimeout(() => {
        setError('رمز الدخول غير صحيح');
        setLoading(false);
        setPassword('');
      }, 200);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0f172a] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[140px]" />
      </div>

      <div className="bg-white w-full max-w-md rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden relative z-10 border border-white/10 animate-in zoom-in duration-300">
        <div className="p-8 sm:p-10 text-center bg-slate-50 border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-[#0f172a] rounded-[1.5rem] sm:rounded-[1.8rem] shadow-2xl shadow-slate-900/20 mb-4 sm:mb-6">
            <Lock className="text-emerald-500" size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">منطقة محمية</h2>
          <div className="mt-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl inline-block text-[10px] sm:text-[11px] font-black uppercase tracking-widest border border-emerald-100">
            {pageLabel}
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border-r-4 border-rose-500 text-rose-700 text-xs font-black animate-shake rounded-xl flex items-center gap-2">
                <ShieldAlert size={16} />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-[0.2em]">رمز مرور الصفحة</label>
              <div className="relative group">
                <input
                  dir="ltr"
                  type="password"
                  required
                  autoFocus
                  inputMode="numeric"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-4 sm:py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#0f172a] focus:bg-white transition-all outline-none font-black text-slate-900 text-center text-2xl sm:text-3xl tracking-[0.5em] placeholder:text-slate-200"
                  placeholder="••••"
                />
                <ShieldCheck className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0f172a] transition-colors" size={24} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 sm:py-5 bg-[#0f172a] text-white font-black text-base sm:text-lg rounded-2xl shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>تأكيد الدخول</span>
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ to: string, icon: any, label: string, onClick?: () => void }> = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link 
      to={to} 
      onClick={onClick} 
      className={`flex items-center gap-4 px-6 py-4 sm:py-5 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40' : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/10'}`}
    >
      <Icon size={24} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-400'}`} />
      <span className="font-black text-base sm:text-lg tracking-tight whitespace-nowrap">{label}</span>
    </Link>
  );
};

const Layout: React.FC<{ children: React.ReactNode, settings: AppSettings | null }> = ({ children, settings }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const location = useLocation();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // اخفاء الهيدر في شاشة الزبون
  const isCustomerView = location.pathname === '/customer-view';

  if (isCustomerView) return <main className="h-screen w-full overflow-hidden">{children}</main>;

  const pageTitle = location.pathname === '/' ? 'نقطة البيع' : 
                   location.pathname === '/inventory' ? 'المخزون' :
                   location.pathname === '/daily-reports' ? 'التقارير اليومية' : 
                   location.pathname === '/customers' ? 'العملاء' :
                   location.pathname === '/expenses' ? 'الإدارة المالية' : 'لوحة التحكم';

  return (
    <div className="h-screen w-full bg-[#f8fafc] flex flex-col overflow-hidden font-['Tajawal']" dir="rtl">
      {/* Header */}
      <header className="h-16 sm:h-20 bg-[#0f172a] border-b border-white/10 flex items-center justify-between px-4 sm:px-6 shrink-0 z-[100] no-print">
        <div className="flex items-center gap-3 sm:gap-6">
          <button onClick={() => setSidebarOpen(true)} className="p-2 sm:p-3 bg-emerald-600 text-white rounded-xl sm:rounded-2xl shadow-lg hover:bg-emerald-500 transition-all active:scale-90">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <FlyytiLogo className="w-8 h-8 sm:w-10 sm:h-10" />
            <h1 className="text-lg sm:text-xl font-black text-white hidden xs:block">Flyyti POS</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-black border border-emerald-500/20">
            {pageTitle}
          </span>
          <button 
            onClick={toggleFullscreen} 
            className="w-9 h-9 sm:w-10 sm:h-10 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {children}
      </main>

      {/* Sidebar Drawer */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] transition-opacity duration-300" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-[280px] sm:w-80 bg-[#0f172a] z-[151] flex flex-col animate-slide-in-right border-l border-white/10 shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FlyytiLogo className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="font-black text-white text-lg sm:text-xl">القائمة</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X size={28} />
              </button>
            </div>
            <nav className="flex-1 p-4 sm:p-6 space-y-2 overflow-y-auto custom-scrollbar">
              <NavItem to="/" icon={ShoppingCart} label="نقطة البيع" onClick={() => setSidebarOpen(false)} />
              <NavItem to="/store" icon={ShoppingBag} label="المتجر الإلكتروني" onClick={() => setSidebarOpen(false)} />
               <NavItem to="/store-products" icon={Package} label="منتجات المتجر" onClick={() => setSidebarOpen(false)} />
               <NavItem to="/store-orders" icon={ShoppingCart} label="طلبات المتجر" onClick={() => setSidebarOpen(false)} />
               <NavItem to="/store-reports" icon={PieChart} label="تقارير المتجر" onClick={() => setSidebarOpen(false)} />
               <NavItem to="/store-settings" icon={Settings} label="إعدادات المتجر" onClick={() => setSidebarOpen(false)} />
              <NavItem to="/daily-reports" icon={LayoutDashboard} label="التقارير اليومية" onClick={() => setSidebarOpen(false)} />
              <NavItem to="/inventory" icon={Package} label="المخزون" onClick={() => setSidebarOpen(false)} />
              <NavItem to="/categories" icon={Tags} label="الأقسام" onClick={() => setSidebarOpen(false)} />
              <NavItem to="/customers" icon={Users} label="العملاء" onClick={() => setSidebarOpen(false)} />
              <NavItem to="/expenses" icon={Wallet} label="المصاريف" onClick={() => setSidebarOpen(false)} />
              <NavItem to="/invoices" icon={FileText} label="سجل الفواتير" onClick={() => setSidebarOpen(false)} />
              <NavItem to="/reports" icon={PieChart} label="التقارير المالية" onClick={() => setSidebarOpen(false)} />
              <NavItem to="/security" icon={Settings} label="إعدادات النظام" onClick={() => setSidebarOpen(false)} />
            </nav>
            <div className="p-6 sm:p-8 border-t border-white/5 opacity-40 text-center">
              <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Flyyti Engine v4.0</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, settings: AppSettings | null }> = ({ children }) => {
  const [status, setStatus] = useState<'checking'|'allowed'|'denied'>('checking');
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { setStatus('denied'); return; }
      const { data, error } = await supabase.rpc('is_store_admin');
      if (alive) setStatus(!error && data === true ? 'allowed' : 'denied');
    };
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { if (alive) { setStatus('checking'); void check(); } });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  if (status === 'checking') return <div dir="rtl" className="min-h-screen flex items-center justify-center">جارٍ التحقق من الدخول...</div>;
  if (status === 'denied') return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PageGuard: React.FC<{ children: React.ReactNode, pageId: string, pageLabel: string, settings: AppSettings | null }> = ({ children, pageId, pageLabel, settings }) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsUnlocked(false);
  }, [location.pathname]);

  const needsProtection = useMemo(() => {
    return settings?.protection_enabled && settings?.page_locks?.[pageId];
  }, [settings, pageId]);

  if (!needsProtection || isUnlocked) {
    return <>{children}</>;
  }

  return (
    <PageAuthOverlay 
      expectedPin={settings?.page_password || '1234'} 
      pageLabel={pageLabel} 
      onUnlock={() => setIsUnlocked(true)} 
    />
  );
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [configMissing, setConfigMissing] = useState(false);
  const location = useLocation();

  const fetchSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSettings(null); return; }
      const { data: allowed } = await supabase.rpc('is_store_admin');
      if (allowed !== true) { setSettings(null); return; }
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
      if (!error && data) setSettings(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.isValid) setConfigMissing(true);
    else fetchSettings();
  }, [fetchSettings]);

  if (location.pathname === '/store') return <OnlineStore />;

  if (configMissing) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 sm:p-6 text-white" dir="rtl">
      <div className="bg-white/5 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-white/10 w-full max-md space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Database size={32} /></div>
          <h1 className="text-2xl sm:text-3xl font-black">Flyyti Engine</h1>
          <p className="text-slate-400 mt-2">إعداد قاعدة البيانات</p>
        </div>
        <form onSubmit={(e: any) => { e.preventDefault(); const url = e.target.url.value; const key = e.target.key.value; if (url && key) saveSupabaseConfig(url, key); }} className="space-y-5">
          <input dir="ltr" name="url" required className="w-full p-4 sm:p-5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl outline-none" placeholder="Supabase URL" />
          <input dir="ltr" name="key" required className="w-full p-4 sm:p-5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl outline-none" placeholder="Anon Key" />
          <button className="w-full py-4 sm:py-5 bg-emerald-600 text-white font-black rounded-xl sm:rounded-2xl hover:bg-emerald-50 transition-all">بدء الربط</button>
        </form>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] gap-6">
      <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      <p className="text-white font-black text-base sm:text-lg">تحميل نظام Flyyti...</p>
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={<Login onLoginSuccess={fetchSettings} />} />
      <Route path="/customer-view" element={<CustomerView />} />
      <Route path="/*" element={
        <ProtectedRoute settings={settings}>
          <Layout settings={settings}>
            <Routes>
              <Route path="/" element={<PageGuard key={location.pathname} pageId="pos" pageLabel="نقطة البيع" settings={settings}><POS /></PageGuard>} />
              <Route path="/daily-reports" element={<PageGuard key={location.pathname} pageId="daily_reports" pageLabel="التقارير اليومية" settings={settings}><DailyReports /></PageGuard>} />
              <Route path="/store-products" element={<StoreManagement section="products" />} />
               <Route path="/store-orders" element={<StoreManagement section="orders" />} />
               <Route path="/store-reports" element={<StoreManagement section="reports" />} />
               <Route path="/store-settings" element={<StoreManagement section="settings" />} />
               <Route path="/inventory" element={<PageGuard key={location.pathname} pageId="inventory" pageLabel="المخزون" settings={settings}><Inventory /></PageGuard>} />
              <Route path="/categories" element={<PageGuard key={location.pathname} pageId="categories" pageLabel="التصنيفات" settings={settings}><Categories /></PageGuard>} />
              <Route path="/customers" element={<PageGuard key={location.pathname} pageId="customers" pageLabel="العملاء" settings={settings}><Customers /></PageGuard>} />
              <Route path="/expenses" element={<PageGuard key={location.pathname} pageId="expenses" pageLabel="المصاريف" settings={settings}><Expenses settings={settings} onUpdateSettings={fetchSettings} /></PageGuard>} />
              <Route path="/invoices" element={<PageGuard key={location.pathname} pageId="invoices" pageLabel="سجل الفواتير" settings={settings}><Invoices settings={settings} onUpdateSettings={fetchSettings} /></PageGuard>} />
              <Route path="/reports" element={<PageGuard key={location.pathname} pageId="reports" pageLabel="التقارير المالية" settings={settings}><GeneralReports /></PageGuard>} />
              <Route path="/security" element={<PageGuard key={location.pathname} pageId="security" pageLabel="إعدادات النظام" settings={settings}><Security settings={settings} onUpdate={fetchSettings} /></PageGuard>} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const Root = () => (
  <HashRouter>
    <App />
  </HashRouter>
);

export default Root;