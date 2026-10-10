
# Flyyti Mobile POS - دليل الإعداد والنشر الاحترافي

نظام Flyyti Mobile POS هو حل متكامل لإدارة المبيعات والمخزون، مصمم ليعمل كـ PWA (تطبيق ويب تقدمي) بأداء عالٍ.

## 🚀 الخطوة 1: تهيئة قاعدة البيانات (Supabase)
1. أنشئ مشروعاً في [Supabase](https://supabase.com).
2. افتح **SQL Editor** وانقر على **New Query**.
3. انسخ محتوى ملف `database.sql` من المشروع والصقه هناك ثم اضغط **Run**.
4. من إعدادات المشروع (Settings > API)، احفظ `URL` و `Anon Key`.

## 🛠️ الخطوة 2: الربط بـ GitHub
1. أنشئ مستودعاً (Repository) جديداً على [GitHub](https://github.com).
2. ارفع ملفات المشروع إلى المستودع باستخدام Git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Flyyti POS V4.0"
   git remote add origin [رابط_مستودعك]
   git push -u origin main
   ```

## 🌐 الخطوة 3: النشر على Vercel
1. سجل الدخول إلى [Vercel](https://vercel.com) واربطه بحساب GitHub.
2. اختر **Add New Project** ثم اختر المستودع الخاص بـ Flyyti.
3. **هام جداً:** في قسم **Environment Variables**، أضف المتغيرات التالية:
   - `VITE_SUPABASE_URL`: (رابط Supabase الخاص بك)
   - `VITE_SUPABASE_ANON_KEY`: (المفتاح الخاص بك)
4. اضغط **Deploy**. سيقوم Vercel ببناء المشروع وتزويدك برابط (URL) آمن.

## 📱 التثبيت كتطبيق (PWA)
بمجرد فتح الرابط من متصفح Chrome (أندرويد) أو Safari (آيفون)، ستظهر لك خيارات "إضافة إلى الشاشة الرئيسية" (Add to Home Screen). سيتحول النظام إلى تطبيق مستقل يعمل بدون شريط المتصفح.

---
**Flyyti POS Engine v4.0**
*نظام آمن، سريع، ومطور لأجلك.*
