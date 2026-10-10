
let audioCtx: AudioContext | null = null;

/**
 * يقوم بتشغيل صوت تنبيه قصير وهادئ (Beep)
 * يستخدم Web Audio API لتجنب تحميل ملفات خارجية وضمان السرعة
 */
export const playScanBeep = () => {
  try {
    // إنشاء سياق الصوت عند أول استدعاء (بسبب قيود المتصفح على التشغيل التلقائي)
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // استئناف سياق الصوت إذا كان متوقفاً (حماية لمتصفحات Chrome/Edge)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // إعدادات الموجة الصوتية
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // تردد 1000 هرتز

    // التحكم في مستوى الصوت والنعومة (Fade in/out) لمنع صوت "الفرقعة"
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01); // رفع الصوت لـ 10%
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); // خفض الصوت تدريجياً

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1); // التوقف بعد 100 مللي ثانية
  } catch (error) {
    // تجنب تعطل التطبيق في حال كان المتصفح يمنع الصوت تماماً
    console.warn("Audio feedback failed:", error);
  }
};
