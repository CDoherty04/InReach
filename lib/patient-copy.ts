import type { Lang } from './types'

type Row = Record<Lang, string>

const rows = {
  skipToPlan: {
    en: 'Skip to plan',
    es: 'Saltar al plan',
    fr: 'Aller au plan',
    zh: '跳到计划',
    vi: 'Chuyển tới kế hoạch',
    ar: 'انتقل إلى الخطة',
  },
  accessibility: {
    en: 'Accessibility',
    es: 'Accesibilidad',
    fr: 'Accessibilité',
    zh: '无障碍',
    vi: 'Trợ năng',
    ar: 'إمكانية الوصول',
  },
  language: {
    en: 'Language',
    es: 'Idioma',
    fr: 'Langue',
    zh: '语言',
    vi: 'Ngôn ngữ',
    ar: 'اللغة',
  },
  textSize: {
    en: 'Text size',
    es: 'Tamaño del texto',
    fr: 'Taille du texte',
    zh: '文字大小',
    vi: 'Cỡ chữ',
    ar: 'حجم النص',
  },
  sizeSm: { en: 'Small', es: 'Pequeño', fr: 'Petit', zh: '小', vi: 'Nhỏ', ar: 'صغير' },
  sizeMd: { en: 'Default', es: 'Normal', fr: 'Normal', zh: '默认', vi: 'Mặc định', ar: 'افتراضي' },
  sizeLg: { en: 'Large', es: 'Grande', fr: 'Grand', zh: '大', vi: 'Lớn', ar: 'كبير' },
  sizeXl: { en: 'Largest', es: 'Máximo', fr: 'Très grand', zh: '最大', vi: 'Rất lớn', ar: 'الأكبر' },
  contrast: { en: 'Contrast', es: 'Contraste', fr: 'Contraste', zh: '高对比', vi: 'Tương phản', ar: 'تباين' },
  waitingSubmit: {
    en: 'Waiting for the doctor to submit this plan.',
    es: 'Esperando que el médico envíe este plan.',
    fr: 'En attente de l’envoi du plan par le médecin.',
    zh: '等待医生提交此计划。',
    vi: 'Đang chờ bác sĩ gửi kế hoạch này.',
    ar: 'بانتظار أن يرسل الطبيب هذا الخطة.',
  },
  rightNow: { en: 'Right now', es: 'Ahora mismo', fr: 'Maintenant', zh: '当前', vi: 'Ngay bây giờ', ar: 'الآن' },
  confirmDoctor: {
    en: 'Confirm doctor',
    es: 'Confirmar médico',
    fr: 'Confirmer le médecin',
    zh: '确认医生',
    vi: 'Xác nhận bác sĩ',
    ar: 'تأكيد الطبيب',
  },
  medications: { en: 'Medications', es: 'Medicamentos', fr: 'Médicaments', zh: '药物', vi: 'Thuốc', ar: 'الأدوية' },
  dischargeSummary: {
    en: 'Discharge summary',
    es: 'Resumen del alta',
    fr: 'Résumé de sortie',
    zh: '出院摘要',
    vi: 'Tóm tắt xuất viện',
    ar: 'ملخص الخروج',
  },
  grantsHeading: {
    en: 'Grant and coverage applications',
    es: 'Solicitudes de ayuda y cobertura',
    fr: 'Demandes d’aides et de couverture',
    zh: '补助与保险申请',
    vi: 'Đơn trợ cấp và bảo hiểm',
    ar: 'طلبات المنح والتغطية',
  },
  answeredYes: { en: 'Answered yes', es: 'Respondió que sí', fr: 'Réponse : oui', zh: '已回答：是', vi: 'Đã trả lời: có', ar: 'تمت الإجابة: نعم' },
  answeredNo: { en: 'Answered no', es: 'Respondió que no', fr: 'Réponse : non', zh: '已回答：否', vi: 'Đã trả lời: không', ar: 'تمت الإجابة: لا' },
  yesTaken: { en: 'Yes, taken', es: 'Sí, la tomó', fr: 'Oui, pris', zh: '是，已服用', vi: 'Có, đã uống', ar: 'نعم، تم أخذه' },
  yesDoctor: {
    en: "Yes, that's the doctor",
    es: 'Sí, es el médico',
    fr: 'Oui, c’est le médecin',
    zh: '是，这是医生',
    vi: 'Có, đúng bác sĩ',
    ar: 'نعم، هذا هو الطبيب',
  },
  noDoctor: {
    en: 'No, this is wrong',
    es: 'No, está mal',
    fr: 'Non, ce n’est pas correct',
    zh: '不，不对',
    vi: 'Không, không đúng',
    ar: 'لا، هذا خطأ',
  },
  voiceAsk: {
    en: 'Ask with voice',
    es: 'Preguntar con voz',
    fr: 'Question vocale',
    zh: '语音提问',
    vi: 'Hỏi bằng giọng nói',
    ar: 'اسأل بالصوت',
  },
  voiceStopListen: {
    en: 'Stop listening',
    es: 'Dejar de escuchar',
    fr: 'Arrêter l’écoute',
    zh: '停止聆听',
    vi: 'Dừng nghe',
    ar: 'إيقاف الاستماع',
  },
  voiceStopSpeak: {
    en: 'Stop spoken answer',
    es: 'Detener respuesta hablada',
    fr: 'Arrêter la réponse',
    zh: '停止朗读',
    vi: 'Dừng đọc câu trả lời',
    ar: 'إيقاف الإجابة الصوتية',
  },
  voiceListening: {
    en: 'Listening…',
    es: 'Escuchando…',
    fr: 'Écoute…',
    zh: '正在聆听…',
    vi: 'Đang nghe…',
    ar: 'جاري الاستماع…',
  },
  voiceNoMic: {
    en: 'This browser does not support the microphone.',
    es: 'Este navegador no tiene micrófono.',
    fr: 'Ce navigateur ne prend pas en charge le micro.',
    zh: '此浏览器不支持麦克风。',
    vi: 'Trình duyệt này không hỗ trợ micro.',
    ar: ' هذا المتصفح لا يدعم الميكروفون.',
  },
  voiceNoQuestion: {
    en: "I didn't catch a question.",
    es: 'No escuché una pregunta.',
    fr: 'Je n’ai pas entendu de question.',
    zh: '没有听清问题。',
    vi: 'Không nghe thấy câu hỏi.',
    ar: 'لم أسمع سؤالاً.',
  },
  voiceHearError: {
    en: "Couldn't hear you. Try again.",
    es: 'No se pudo oír. Intente otra vez.',
    fr: 'Impossible de vous entendre. Réessayez.',
    zh: '无法听清，请重试。',
    vi: 'Không nghe được. Thử lại.',
    ar: 'تعذّر سماعك. حاول مرة أخرى.',
  },
  voiceThinking: {
    en: 'Thinking…',
    es: 'Pensando…',
    fr: 'Réflexion…',
    zh: '思考中…',
    vi: 'Đang suy nghĩ…',
    ar: 'جاري التفكير…',
  },
} as const

export type CopyKey = keyof typeof rows

export function patientCopy(lang: Lang, key: CopyKey): string {
  const row = rows[key]
  return row[lang] ?? row.en
}

export function patientSubtitle(lang: Lang, caregiver: string, city: string): string {
  const templates: Record<Lang, string> = {
    en: `${caregiver} · ${city} · first 72 hours after discharge`,
    es: `${caregiver} · ${city} · primeras 72 horas`,
    fr: `${caregiver} · ${city} · premières 72 heures`,
    zh: `${caregiver} · ${city} · 出院后 72 小时`,
    vi: `${caregiver} · ${city} · 72 giờ đầu sau xuất viện`,
    ar: `${caregiver} · ${city} · أول 72 ساعة بعد الخروج`,
  }
  return templates[lang] ?? templates.en
}

export function taskQuestion(lang: Lang, task: { questionEn: string; questionEs: string }): string {
  if (lang === 'es') return task.questionEs
  return task.questionEn
}

export function timesPerDay(lang: Lang, count: number): string {
  const n = Math.max(1, Math.round(count))
  if (lang === 'es') return n === 1 ? '1 vez al día' : `${n} veces al día`
  if (lang === 'fr') return n === 1 ? '1 fois par jour' : `${n} fois par jour`
  if (lang === 'zh') return `每天 ${n} 次`
  if (lang === 'vi') return n === 1 ? '1 lần mỗi ngày' : `${n} lần mỗi ngày`
  if (lang === 'ar') return n === 1 ? 'مرة واحدة في اليوم' : `${n} مرات في اليوم`
  return n === 1 ? '1 time a day' : `${n} times a day`
}
