
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';

// Custom Logo Component (FL Stylized)
const FlyytiLogo = ({ className = "w-20 h-20" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 20H55V35H35V45H50V60H35V80L20 90V20Z" fill="white" />
    <path d="M45 20L65 50V75H85V90H45V20Z" fill="#FF7A00" />
  </svg>
);

const Login: React.FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError || !data.user) {
        console.error('Supabase sign-in:', authError?.message, authError?.code);
        const code = authError?.code;
        setError(code === 'email_not_confirmed' ? 'البريد الإلكتروني غير مؤكد. افتح Supabase ← Authentication ← Users وتأكد من تأكيد الحساب.' : code === 'invalid_credentials' ? 'بيانات الدخول غير صحيحة. استخدم البريد وكلمة المرور المسجلين في Authentication ← Users، وليس بيانات جدول settings.' : 'تعذّر تسجيل الدخول: ' + (authError?.message || 'تحقق من إعدادات حساب Supabase.'));
        return;
      }
      const { data: allowed, error: roleError } = await supabase.rpc('is_store_admin');
      if (roleError || allowed !== true) {
        console.error('Store admin authorization:', roleError?.message || 'User is not an admin');
        await supabase.auth.signOut();
        setError('الحساب لا يملك صلاحية مدير المتجر.'); return;
      }
      onLoginSuccess();
      navigate('/', { replace: true });
    } catch (err) {
      setError('خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6" dir="rtl">
      {/* Decorative background elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-white/10">
        {/* Card Header */}
        <div className="p-10 text-center bg-slate-50 border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#0f172a] rounded-[1.5rem] shadow-2xl shadow-slate-900/20 mb-6">
            <FlyytiLogo className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Flyyti Mobile POS</h1>
          <p className="text-slate-500 mt-2 font-bold">نظام الإدارة المتطور</p>
        </div>

        {/* Form Content */}
        <div className="p-10">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border-r-4 border-rose-500 text-rose-700 text-xs font-black animate-pulse rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-1 uppercase tracking-widest">البريد الإلكتروني</label>
              <div className="relative group">
                <input
                  type="email"
                  autoComplete="username"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-4 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#0f172a] focus:bg-white transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="البريد الإلكتروني لحساب Supabase"
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0f172a] transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-1 uppercase tracking-widest">كلمة المرور</label>
              <div className="relative group">
                <input
                  dir="ltr"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-[#0f172a] focus:bg-white transition-all outline-none font-bold text-slate-900 placeholder:text-slate-300 text-center"
                  placeholder="••••••••"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0f172a] transition-colors" size={20} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-emerald-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-900/20 hover:bg-emerald-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>تسجيل الدخول للنظام</span>
                  <ArrowLeft size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] opacity-50">
              محمي بواسطة Flyyti Security &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
