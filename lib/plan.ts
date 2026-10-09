import type { Lang, Medication, ParseResult, PlanFields, Prefs, TaskDraft, TaskView } from './types'

export const ANNUAL_RATE_CENTS = 500000

export const GRANTS = [
  { href: 'https://www.kancare.ks.gov/', label: 'KanCare (Kansas Medicaid)' },
  { href: 'https://www.ssa.gov/benefits/disability/', label: 'Social Security disability application' },
  { href: 'https://www.needymeds.org/', label: 'NeedyMeds' },
] as const

const CLOCK: Record<number, number[]> = {
  1: [8],
  2: [8, 20],
  3: [8, 14, 20],
  4: [8, 12, 16, 20],
  5: [8, 11, 14, 17, 20],
  6: [0, 6, 10, 14, 18, 22],
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const MONTHS_VI = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const WEEKDAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const WEEKDAYS_ZH = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const WEEKDAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const ES_DRUG: Record<string, string> = {
  ibuprofen: 'ibuprofeno',
  acetaminophen: 'acetaminofén',
  enoxaparin: 'enoxaparina',
}

const MED_LINE =
  /^(.+?)\s*\|\s*([^|]+?)\s*\|\s*qty\s+(\d+)\s*\|\s*every\s+(\d+)\s*hours?\s*\|\s*(\d+)\s*days?\s*$/i
const MED_LINE_GLOBAL =
  /(?:^|[\n•\-–—]\s*)(.+?)\s*\|\s*([^|]+?)\s*\|\s*qty\s+(\d+)\s*\|\s*every\s+(\d+)\s*hours?\s*\|\s*(\d+)\s*days?/gi

export function newId(): string {
  return globalThis.crypto.randomUUID()
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function isPatientId(id: string): boolean {
  return id.length > 0 && id.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
}

export function patientPath(id: string): string {
  if (!isPatientId(id)) throw new Error('Bad patient id')
  return `/p/${id}`
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return base || 'patient'
}

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1)
  return null
}

export function formatPhone(digits: string): string {
  const clean = normalizePhone(digits) ?? digits.replace(/\D/g, '')
  if (clean.length !== 10) return digits
  return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function volumeEstimate(discharges: number): { discharges: number; annualCents: number; perDischargeCents: number } | null {
  if (!Number.isInteger(discharges) || discharges < 1 || discharges > 100000) return null
  return {
    discharges,
    annualCents: ANNUAL_RATE_CENTS,
    perDischargeCents: Math.round(ANNUAL_RATE_CENTS / discharges),
  }
}

export function cardError(card: string, expiry: string, cvc: string, now = new Date()): string | null {
  const digits = card.replace(/\s+/g, '')
  if (!/^\d{16}$/.test(digits)) return 'Enter a 16-digit card number.'
  const match = expiry.trim().match(/^(\d{2})\/(\d{2})$/)
  if (!match) return 'Enter the expiration as MM/YY.'
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return 'Enter a real expiration month.'
  const end = new Date(Date.UTC(year, month, 1))
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  if (end <= current) return 'That card is expired.'
  if (!/^\d{3,4}$/.test(cvc.trim())) return 'Enter the 3-digit security code.'
  return null
}

export function defaultPrefs(): Prefs {
  return { lang: 'en', textSize: 'md', contrast: false, dark: false }
}

const LANGS: Prefs['lang'][] = ['en', 'es', 'fr', 'zh', 'vi', 'ar']

export function sanitizePrefs(input: unknown): Prefs | null {
  if (!input || typeof input !== 'object') return null
  const value = input as Partial<Prefs>
  if (!value.lang || !LANGS.includes(value.lang)) return null
  if (value.textSize !== 'sm' && value.textSize !== 'md' && value.textSize !== 'lg' && value.textSize !== 'xl') return null
  if (typeof value.contrast !== 'boolean' || typeof value.dark !== 'boolean') return null
  return {
    lang: value.lang,
    textSize: value.textSize,
    contrast: value.contrast,
    dark: value.dark,
  }
}

export function chicagoParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const map: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value
  }
  let hour = Number(map.hour)
  if (hour === 24) hour = 0
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
  }
}

export function utcFromChicago(year: number, month: number, day: number, hour: number, minute = 0): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute)
  for (let i = 0; i < 4; i += 1) {
    const parts = chicagoParts(new Date(utc))
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    const want = Date.UTC(year, month - 1, day, hour, minute)
    if (got === want) return new Date(utc)
    utc += want - got
  }
  const parts = chicagoParts(new Date(utc))
  if (parts.year === year && parts.month === month && parts.day === day && parts.hour === hour && parts.minute === minute) {
    return new Date(utc)
  }
  throw new Error(`Could not convert Chicago time ${year}-${month}-${day} ${hour}:${minute}`)
}

function addCalendarDays(year: number, month: number, day: number, add: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + add))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() }
}

function weekdayIndex(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function dischargeMorningAnchor(now = new Date()): Date {
  const parts = chicagoParts(now)
  let discharge = utcFromChicago(parts.year, parts.month, parts.day, 7, 0)
  if (discharge.getTime() > now.getTime()) {
    const yesterday = addCalendarDays(parts.year, parts.month, parts.day, -1)
    discharge = utcFromChicago(yesterday.year, yesterday.month, yesterday.day, 7, 0)
  }
  return discharge
}

export function formatClock(hour: number, minute: number, lang: Lang = 'en'): string {
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const minutes = String(minute).padStart(2, '0')
  if (lang === 'zh') {
    const period = hour >= 12 ? '下午' : '上午'
    return `${period}${hour12}:${minutes}`
  }
  if (lang === 'ar') {
    return `${hour12}:${minutes} ${hour >= 12 ? 'م' : 'ص'}`
  }
  const ampm =
    hour >= 12
      ? lang === 'es'
        ? 'p.m.'
        : lang === 'fr'
          ? ''
          : 'PM'
      : lang === 'es'
        ? 'a.m.'
        : lang === 'fr'
          ? ''
          : 'AM'
  if (lang === 'fr') {
    return `${hour12} h ${minutes}`
  }
  return `${hour12}:${minutes} ${ampm}`.trim()
}

export function formatWhen(date: Date, lang: Lang = 'en'): string {
  const parts = chicagoParts(date)
  const weekday = weekdayIndex(parts.year, parts.month, parts.day)
  const time = formatClock(parts.hour, parts.minute, lang)
  switch (lang) {
    case 'es':
      return `${time} del ${WEEKDAYS_ES[weekday]}, ${parts.day} ${MONTHS_ES[parts.month - 1]}`
    case 'fr':
      return `${time}, ${WEEKDAYS_FR[weekday]} ${parts.day} ${MONTHS_FR[parts.month - 1]}`
    case 'zh':
      return `${WEEKDAYS_ZH[weekday]} ${parts.month}月${parts.day}日 ${time}`
    case 'vi':
      return `${time}, ${WEEKDAYS_VI[weekday]}, ngày ${parts.day} tháng ${MONTHS_VI[parts.month - 1]}`
    case 'ar':
      return `${time}، ${WEEKDAYS_AR[weekday]} ${parts.day} ${MONTHS_AR[parts.month - 1]}`
    default:
      return `${time} on ${WEEKDAYS_EN[weekday]}, ${MONTHS_EN[parts.month - 1]} ${parts.day}`
  }
}

export function formatStamp(date: Date, lang: Lang = 'en'): string {
  const parts = chicagoParts(date)
  if (lang === 'zh') return `${parts.month}月${parts.day}日 ${formatClock(parts.hour, parts.minute, lang)}`
  if (lang === 'es') return `${parts.day} ${MONTHS_ES[parts.month - 1]}, ${formatClock(parts.hour, parts.minute, lang)}`
  if (lang === 'fr') return `${parts.day} ${MONTHS_FR[parts.month - 1]}, ${formatClock(parts.hour, parts.minute, lang)}`
  if (lang === 'vi') return `${parts.day}/${parts.month}, ${formatClock(parts.hour, parts.minute, lang)}`
  if (lang === 'ar') return `${parts.day} ${MONTHS_AR[parts.month - 1]}، ${formatClock(parts.hour, parts.minute, lang)}`
  return `${MONTHS_EN[parts.month - 1]} ${parts.day}, ${formatClock(parts.hour, parts.minute, lang)}`
}

export function timesPerDayLabel(count: number, lang: Lang = 'en'): string {
  const n = clampInt(count, 1, 6)
  switch (lang) {
    case 'es':
      return n === 1 ? '1 vez al día' : `${n} veces al día`
    case 'fr':
      return n === 1 ? '1 fois par jour' : `${n} fois par jour`
    case 'zh':
      return `每天 ${n} 次`
    case 'vi':
      return n === 1 ? '1 lần mỗi ngày' : `${n} lần mỗi ngày`
    case 'ar':
      return n === 1 ? 'مرة واحدة في اليوم' : `${n} مرات في اليوم`
    default:
      return n === 1 ? '1 time a day' : `${n} times a day`
  }
}

export function durationLabel(days: number, lang: Lang = 'en'): string {
  const n = clampInt(days, 1, 30)
  switch (lang) {
    case 'es':
      return n === 1 ? '1 día' : `${n} días`
    case 'fr':
      return n === 1 ? '1 jour' : `${n} jours`
    case 'zh':
      return `${n} 天`
    case 'vi':
      return n === 1 ? '1 ngày' : `${n} ngày`
    case 'ar':
      return n === 1 ? 'يوم واحد' : `${n} أيام`
    default:
      return n === 1 ? '1 day' : `${n} days`
  }
}

export function clockPreview(frequency: number, lang: Lang = 'en'): string {
  const hours = CLOCK[clampInt(frequency, 1, 6)]
  const labels = hours.map((hour) => formatClock(hour, 0, lang))
  const join = lang === 'es' ? ' y ' : ' and '
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]}${join}${labels[1]}`
  const head = labels.slice(0, -1).join(', ')
  const tail = labels[labels.length - 1]
  return lang === 'es' ? `${head} y ${tail}` : `${head}, and ${tail}`
}

function drugName(name: string, lang: Lang): string {
  const lower = name.trim().toLowerCase()
  if (lang === 'es' && ES_DRUG[lower]) return ES_DRUG[lower]
  return lower
}

export function medQuestion(medName: string, whenLabel: string, lang: Lang): string {
  const name = drugName(medName, lang)
  switch (lang) {
    case 'es':
      return `¿Ya tomó su ${name} a las ${whenLabel}?`
    case 'fr':
      return `A-t-il/elle pris son ${name} à ${whenLabel} ?`
    case 'zh':
      return `是否在 ${whenLabel} 服用了 ${name}？`
    case 'vi':
      return `Họ đã uống ${name} lúc ${whenLabel} chưa?`
    case 'ar':
      return `هل تناول ${name} في ${whenLabel}؟`
    default:
      return `Have they taken their ${name} at ${whenLabel}?`
  }
}

export function verifyQuestion(doctorName: string, patientName: string, lang: Lang): string {
  switch (lang) {
    case 'es':
      return `¿${doctorName} es quien dio el alta de ${patientName}?`
    case 'fr':
      return `${doctorName} est-il le médecin de sortie de ${patientName} ?`
    case 'zh':
      return `${doctorName} 是 ${patientName} 的出院医生吗？`
    case 'vi':
      return `${doctorName} có phải bác sĩ cho ${patientName} xuất viện không?`
    case 'ar':
      return `هل ${doctorName} هو طبيب خروج ${patientName} من المستشفى؟`
    default:
      return `Is ${doctorName} the doctor for ${patientName}'s discharge?`
  }
}

export function taskQuestionForLang(
  lang: Lang,
  task: { kind: 'verify' | 'med'; medName: string | null; scheduledFor: string },
  names: { patientName: string; doctorName: string },
): string {
  if (task.kind === 'verify') return verifyQuestion(names.doctorName, names.patientName, lang)
  const when = formatWhen(new Date(task.scheduledFor), lang)
  return medQuestion(task.medName || 'medication', when, lang)
}

export function doseInstants(frequencyPerDay: number, durationDays: number, discharge: Date): Date[] {
  const hours = CLOCK[clampInt(frequencyPerDay, 1, 6)]
  const start = discharge.getTime()
  const end = start + Math.min(72, clampInt(durationDays, 1, 30) * 24) * 60 * 60 * 1000
  const origin = chicagoParts(discharge)
  const times: Date[] = []
  for (let dayOffset = 0; dayOffset < 5; dayOffset += 1) {
    const day = addCalendarDays(origin.year, origin.month, origin.day, dayOffset)
    for (const hour of hours) {
      const when = utcFromChicago(day.year, day.month, day.day, hour, 0)
      const time = when.getTime()
      if (time >= start && time < end) times.push(when)
    }
  }
  times.sort((a, b) => a.getTime() - b.getTime())
  return times
}

export function buildTasks(input: {
  patientId: string
  patientName: string
  doctorName: string
  medications: Pick<Medication, 'name' | 'dose' | 'quantity' | 'frequencyPerDay' | 'durationDays'>[]
  dischargeAt: Date
}): TaskDraft[] {
  const tasks: TaskDraft[] = [
    {
      id: `${input.patientId}:verify`,
      patientId: input.patientId,
      kind: 'verify',
      medName: null,
      dose: null,
      quantity: null,
      scheduledFor: input.dischargeAt.toISOString(),
    },
  ]
  for (const med of input.medications) {
    const doses = doseInstants(med.frequencyPerDay, med.durationDays, input.dischargeAt)
    for (const when of doses) {
      const iso = when.toISOString()
      tasks.push({
        id: `${input.patientId}:med:${slugify(med.name)}:${iso}`,
        patientId: input.patientId,
        kind: 'med',
        medName: med.name,
        dose: med.dose,
        quantity: med.quantity,
        scheduledFor: iso,
      })
    }
  }
  return tasks
}

export function presentTask(
  task: {
    id: string
    kind: 'verify' | 'med'
    medName: string | null
    scheduledFor: Date
    sentAt: Date | null
    response: 'yes' | 'no' | null
  },
  names: { patientName: string; doctorName: string },
  now: Date,
): TaskView {
  const whenEn = formatWhen(task.scheduledFor, 'en')
  const whenEs = formatWhen(task.scheduledFor, 'es')
  const questionEn =
    task.kind === 'verify'
      ? verifyQuestion(names.doctorName, names.patientName, 'en')
      : medQuestion(task.medName || 'medication', whenEn, 'en')
  const questionEs =
    task.kind === 'verify'
      ? verifyQuestion(names.doctorName, names.patientName, 'es')
      : medQuestion(task.medName || 'medication', whenEs, 'es')
  const overdue =
    task.sentAt !== null &&
    task.response === null &&
    now.getTime() - task.scheduledFor.getTime() > 15 * 60 * 1000
  return {
    id: task.id,
    kind: task.kind,
    medName: task.medName,
    scheduledFor: task.scheduledFor.toISOString(),
    sentAt: task.sentAt ? task.sentAt.toISOString() : null,
    response: task.response,
    questionEn,
    questionEs,
    stampEn: formatStamp(task.scheduledFor),
    overdue,
    delivery: null,
  }
}

const SMS_PAGE: Record<Lang, string> = {
  en: 'Patient page',
  es: 'Página del paciente',
  fr: 'Page du patient',
  zh: '患者页面',
  vi: 'Trang bệnh nhân',
  ar: 'صفحة المريض',
}

export function reminderSms(
  lang: Lang,
  input: {
    caregiverName: string
    patientName: string
    doctorName: string
    hospitalName: string
    kind: 'verify' | 'med'
    medName: string | null
    href: string
    scheduledFor: Date
  },
): string {
  const who = `${input.caregiverName} · ${input.patientName}`
  const when = formatWhen(input.scheduledFor, lang)
  const header =
    lang === 'es'
      ? `InReach — mensaje para ${who}`
      : lang === 'fr'
        ? `InReach — message pour ${who}`
        : lang === 'zh'
          ? `InReach — ${who} 的提醒`
          : lang === 'vi'
            ? `InReach — tin nhắn cho ${who}`
            : lang === 'ar'
              ? `InReach — رسالة إلى ${who}`
              : `InReach — text for ${who}`
  const lines = [header, '']
  if (input.kind === 'verify') {
    lines.push(verifyQuestion(input.doctorName, input.patientName, lang))
    if (lang === 'es') {
      lines.push(`${input.doctorName} en ${input.hospitalName} pidió ayuda tras el alta de ${input.patientName}.`)
    } else if (lang === 'fr') {
      lines.push(`${input.doctorName} à ${input.hospitalName} a demandé de l’aide après la sortie de ${input.patientName}.`)
    } else if (lang === 'zh') {
      lines.push(`${input.hospitalName} 的 ${input.doctorName} 在 ${input.patientName} 出院后请求协助。`)
    } else if (lang === 'vi') {
      lines.push(`${input.doctorName} tại ${input.hospitalName} cần hỗ trợ sau khi ${input.patientName} xuất viện.`)
    } else if (lang === 'ar') {
      lines.push(`طلب ${input.doctorName} في ${input.hospitalName} المساعدة بعد خروج ${input.patientName}.`)
    } else {
      lines.push(
        `${input.doctorName} at ${input.hospitalName} asked us to help after ${input.patientName}'s discharge. Confirm this is the right doctor on their page.`,
      )
    }
  } else {
    lines.push(medQuestion(input.medName || 'medication', when, lang))
  }
  lines.push('', `${SMS_PAGE[lang]}: ${input.href}`)
  return lines.join('\n')
}

export function englishSms(input: {
  caregiverName: string
  patientName: string
  doctorName: string
  hospitalName: string
  kind: 'verify' | 'med'
  medName: string | null
  href: string
  whenLabel: string
}): string {
  const who = `${input.caregiverName} and ${input.patientName}`
  const lines = [`InReach — text for ${who}`, '']
  if (input.kind === 'verify') {
    lines.push(
      `${input.doctorName} at ${input.hospitalName} asked us to help after ${input.patientName}'s discharge. Confirm this is the right doctor on their page.`,
    )
  } else {
    lines.push(medQuestion(input.medName || 'medication', input.whenLabel, 'en'))
  }
  lines.push('', `${SMS_PAGE.en}: ${input.href}`)
  return lines.join('\n')
}

export function buildSummary(input: {
  name: string
  city: string
  doctorName: string
  caregiverName: string
  medications: { name: string; dose: string }[]
  physicalTherapy: string
  equipment: string[]
}): string {
  const meds = input.medications.map((med) => `${med.name} ${med.dose}`.trim()).filter(Boolean).join(', ')
  const equipment = input.equipment.length ? input.equipment.join(', ') : 'none listed'
  const therapy = input.physicalTherapy.trim() || 'None listed.'
  return `${input.name} is home in ${input.city} after discharge by ${input.doctorName}. ${input.caregiverName} is the caregiver on the text thread. Medications: ${meds || 'none listed'}. Physical therapy: ${therapy} Equipment: ${equipment}. Texts cover the first 72 hours.`
}

function cleanMedId(id: string | undefined): string {
  if (id && /^[a-zA-Z0-9-]{8,80}$/.test(id)) return id
  return newId()
}

const CHART_LABELS = [
  'Name',
  'Age',
  'Sex',
  'Procedure',
  'Surgery date',
  'Postoperative day',
  'Primary caregiver',
  'Caregiver phone',
  'Patient phone',
  'Patient mobile',
  'Care setting',
  'Author',
  'Attending',
  'Physician',
  'Doctor',
  'Hospital',
  'City',
  'Status',
]

/** PDF extractors often glue section headers and chart labels onto one line; reopen structure first. */
export function normalizeDischargeText(note: string): string {
  let text = note.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim()
  if (!text) return text

  for (const header of ['Medications', 'Physical therapy', 'Physical Therapy', 'Equipment']) {
    const escaped = header.replace(/ /g, '\\s+')
    text = text.replace(new RegExp(`(\\S)\\s+\\b(${escaped})\\b\\s*:?\\s*`, 'gi'), `$1\n$2\n`)
  }

  for (const label of CHART_LABELS) {
    const escaped = label.replace(/ /g, '\\s+')
    text = text.replace(new RegExp(`(?<![\\n])\\s+\\b(${escaped})\\s*:`, 'gi'), `\n$1:`)
  }

  return text.replace(/\n{3,}/g, '\n\n')
}

export function mergeParseResults(primary: ParseResult, secondary: ParseResult): ParseResult {
  const pick = (a?: string, b?: string) => {
    const left = a?.trim()
    const right = b?.trim()
    return left || right || undefined
  }
  const medications =
    primary.medications.length >= secondary.medications.length ? primary.medications : secondary.medications
  const physicalTherapy = primary.physicalTherapy.trim() || secondary.physicalTherapy.trim()
  const equipment = primary.equipment.length >= secondary.equipment.length ? primary.equipment : secondary.equipment
  const warnings = [...new Set([...primary.warnings, ...secondary.warnings])]
  const name = pick(primary.name, secondary.name)
  const caregiverName = pick(primary.caregiverName, secondary.caregiverName)
  const doctorName = pick(primary.doctorName, secondary.doctorName)
  const caregiverPhone = pick(primary.caregiverPhone, secondary.caregiverPhone)
  const identity = Boolean(name || caregiverName || doctorName || caregiverPhone)
  if (!medications.length && !physicalTherapy && !equipment.length && !identity) {
    return {
      medications: [],
      physicalTherapy: '',
      equipment: [],
      warnings,
      error: primary.error || secondary.error || 'This document had no medications, therapy, or equipment.',
    }
  }
  return {
    medications,
    physicalTherapy,
    equipment,
    warnings,
    name,
    phone: pick(primary.phone, secondary.phone),
    caregiverName,
    caregiverPhone,
    doctorName,
    hospitalName: pick(primary.hospitalName, secondary.hospitalName),
    city: pick(primary.city, secondary.city),
    procedure: pick(primary.procedure, secondary.procedure),
  }
}

function leadName(note: string): string | undefined {
  for (const raw of note.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (/^(medications?|physical therapy|equipment|patient information|subjective|objective|assessment)\b/i.test(line)) {
      continue
    }
    if (/^[^:]+:\s*\S/.test(line)) continue
    if (/^[\p{L}'’.-]+(?:\s+[\p{L}'’.-]+){0,3}$/u.test(line) && line.length <= 80) return line
    const tokens = line.split(/\s+/)
    const parts: string[] = []
    for (const token of tokens) {
      if (!/^[\p{Lu}][\p{L}'’\-.,]*$/u.test(token)) break
      parts.push(token.replace(/[.,]+$/, ''))
      if (parts.length === 2 && tokens.length > 3) return parts.join(' ')
      if (parts.length >= 4) break
    }
    if (parts.length >= 1 && parts.length <= 4) return parts.join(' ')
    break
  }
  return undefined
}

function cityFromNarrative(note: string): string | undefined {
  const homeTo = note.match(/\bdischarge home to\s+([^.;\n]+)/i)
  if (homeTo) return homeTo[1].replace(/\s+/g, ' ').trim()
  const homeIn = note.match(/\bhome in\s+(.+?)\s+after\b/i)
  if (homeIn) return homeIn[1].replace(/\s+/g, ' ').trim()
  return undefined
}

function hospitalFromNarrative(note: string): string | undefined {
  const match = note.match(/\b(?:at|from)\s+([A-Z][A-Za-z0-9&'’\-\s]+Hospital\b[^.;\n]*)/)
  return match?.[1]?.replace(/\s+/g, ' ').trim()
}

function extractPipeMedications(note: string, warnings: string[]): Medication[] {
  const medications: Medication[] = []
  const seen = new Set<string>()
  for (const match of note.matchAll(MED_LINE_GLOBAL)) {
    const name = match[1].trim().replace(/^[-–—•]\s*/, '')
    const line = `${name} | ${match[2].trim()} | qty ${match[3]} | every ${match[4]} hours | ${match[5]} days`
    const parsed = parseMedicationLine(line)
    if ('error' in parsed) continue
    const key = `${parsed.med.name}:${parsed.med.dose}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    medications.push(parsed.med)
    if (parsed.warning) warnings.push(parsed.warning)
  }
  return medications
}

function chartFields(note: string): Record<string, string> {
  const found: { label: string; end: number; index: number }[] = []
  for (const label of CHART_LABELS) {
    const pattern = new RegExp(`\\b${label.replace(/ /g, '\\s+')}\\s*:`, 'gi')
    for (const match of note.matchAll(pattern)) {
      if (match.index === undefined) continue
      found.push({ label: label.toLowerCase(), index: match.index, end: match.index + match[0].length })
    }
  }
  found.sort((a, b) => a.index - b.index)
  const fields: Record<string, string> = {}
  for (let index = 0; index < found.length; index += 1) {
    const current = found[index]
    const next = found[index + 1]?.index ?? note.length
    const value = note.slice(current.end, next).replace(/\s+/g, ' ').trim()
    if (value && !fields[current.label]) fields[current.label] = value
  }
  return fields
}

function caregiverFromChart(value: string): string {
  const [name, rest] = value.split(',')
  if (rest && /spouse|wife|husband|partner|daughter|son|parent|mother|father|sibling|friend/i.test(rest)) {
    return name.trim()
  }
  return value.trim()
}

function narrativePlan(note: string): { physicalTherapy: string; equipment: string[] } {
  const flat = note.replace(/\s+/g, ' ')
  const sentences = flat.split(/(?<=[.])\s+/).map((sentence) => sentence.trim()).filter(Boolean)
  const therapy = sentences.filter((sentence) =>
    /physical and occupational therapy|physical therapy|occupational therapy|using a walker|avoid twisting|standby assistance/i.test(
      sentence,
    ),
  )
  const equipment: string[] = []
  if (/\bwalker\b/i.test(flat)) equipment.push('Walker')
  if (/\bwheelchair\b/i.test(flat)) equipment.push('Wheelchair')
  if (/\bhospital bed\b/i.test(flat)) equipment.push('Hospital bed')
  if (/\bcane\b/i.test(flat)) equipment.push('Cane')
  if (/\b(?:must wear|prescribed|lumbar) brace\b/i.test(flat)) equipment.push('Brace')
  return { physicalTherapy: therapy.join(' '), equipment }
}

export function parseDischarge(note: string): ParseResult {
  const normalized = normalizeDischargeText(note)
  const warnings: string[] = []
  const medications: Medication[] = []
  const therapy: string[] = []
  const equipment: string[] = []
  let section: 'none' | 'meds' | 'pt' | 'eq' = 'none'

  for (const raw of normalized.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (/^medications?\s*:?$/i.test(line)) {
      section = 'meds'
      continue
    }
    if (/^physical therapy\s*:?$/i.test(line)) {
      section = 'pt'
      continue
    }
    if (/^equipment\s*:?$/i.test(line)) {
      section = 'eq'
      continue
    }
    const item = line.replace(/^[-*•]\s*/, '').trim()
    if (section === 'meds') {
      if (!/\|\s*qty\s+\d+/i.test(item)) continue
      const parsed = parseMedicationLine(item)
      if ('error' in parsed) continue
      medications.push(parsed.med)
      if (parsed.warning) warnings.push(parsed.warning)
    } else if (section === 'pt') {
      therapy.push(item)
    } else if (section === 'eq' && item) {
      for (const piece of item.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean)) {
        equipment.push(piece)
      }
    }
  }

  const piped = extractPipeMedications(normalized, warnings)
  if (piped.length >= medications.length) {
    medications.length = 0
    medications.push(...piped)
  }

  const chart = chartFields(normalized)
  const narrative = narrativePlan(normalized)
  const physicalTherapy = therapy.join(' ') || narrative.physicalTherapy
  const listedEquipment = equipment.length ? equipment : narrative.equipment
  const name = chart.name || leadName(normalized)
  const caregiverName = chart['primary caregiver'] ? caregiverFromChart(chart['primary caregiver']) : undefined
  const caregiverPhone = chart['caregiver phone']
  const phone = chart['patient phone'] || chart['patient mobile']
  const doctorName = chart.author || chart.attending || chart.physician || chart.doctor
  const hospitalName = chart.hospital || hospitalFromNarrative(normalized)
  const city = chart.city || cityFromNarrative(normalized)
  const procedure = chart.procedure
  const identity = Boolean(name || caregiverName || doctorName || caregiverPhone)

  if (!medications.length && !physicalTherapy && !listedEquipment.length) {
    return {
      medications: [],
      physicalTherapy: '',
      equipment: [],
      warnings,
      error:
        'This document had no medications, therapy, or equipment. You can still type a plan, or use lines like: Ibuprofen | 600 mg | qty 1 | every 8 hours | 7 days',
    }
  }
  return {
    medications,
    physicalTherapy,
    equipment: listedEquipment,
    warnings,
    name,
    phone,
    caregiverName,
    caregiverPhone,
    doctorName,
    hospitalName,
    city,
    procedure,
  }
}

function parseMedicationLine(line: string): { med: Medication; warning?: string } | { error: string } {
  const match = line.match(MED_LINE)
  if (!match) return { error: `Skipped medication line: ${line}` }
  const every = Number(match[4])
  const quantityRaw = Number(match[3])
  const durationRaw = Number(match[5])
  if (every <= 0 || quantityRaw < 1 || durationRaw < 1) {
    return { error: `Skipped medication line: ${line}` }
  }
  const quantity = clampInt(quantityRaw, 1, 6)
  const durationDays = clampInt(durationRaw, 1, 30)
  const frequencyPerDay = clampInt(Math.round(24 / every), 1, 6)
  const warning =
    quantity !== quantityRaw || durationDays !== durationRaw
      ? `${match[1].trim()} was adjusted to fit the sliders.`
      : undefined
  return {
    med: {
      id: newId(),
      name: match[1].trim(),
      dose: match[2].trim(),
      quantity,
      frequencyPerDay,
      durationDays,
    },
    warning,
  }
}

function asText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function validatePlan(input: PlanFields): { ok: true; value: PlanFields } | { ok: false; error: string } {
  const name = asText(input.name, 80)
  const caregiverName = asText(input.caregiverName, 80)
  const doctorName = asText(input.doctorName, 80)
  const hospitalName = asText(input.hospitalName, 120)
  const city = asText(input.city, 80)
  const phone = normalizePhone(asText(input.phone, 30))
  const caregiverPhone = normalizePhone(asText(input.caregiverPhone, 30))
  const dischargeNote = asText(input.dischargeNote, 20000)
  const physicalTherapy = asText(input.physicalTherapy, 2000)
  if (!name) return { ok: false, error: 'Enter the patient name.' }
  if (!caregiverName) return { ok: false, error: 'Enter the caregiver name.' }
  if (!doctorName) return { ok: false, error: 'Enter the doctor name.' }
  if (!hospitalName) return { ok: false, error: 'Enter the hospital name.' }
  if (!city) return { ok: false, error: 'Enter a city.' }
  if (!phone) return { ok: false, error: 'Enter a 10-digit patient mobile number.' }
  if (!caregiverPhone) return { ok: false, error: 'Enter a 10-digit caregiver mobile number.' }
  if (!Array.isArray(input.medications) || input.medications.length < 1) {
    return { ok: false, error: 'Add at least one medication.' }
  }
  if (input.medications.length > 12) return { ok: false, error: 'Keep the list to 12 medications.' }
  const medications: Medication[] = []
  const seen = new Set<string>()
  for (const med of input.medications) {
    const medName = asText(med?.name, 80)
    const dose = asText(med?.dose, 40)
    if (!medName) return { ok: false, error: 'Each medication needs a name.' }
    if (!dose) return { ok: false, error: `Enter a dose for ${medName}.` }
    const quantity = Number(med?.quantity)
    const frequencyPerDay = Number(med?.frequencyPerDay)
    const durationDays = Number(med?.durationDays)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 6) {
      return { ok: false, error: `${medName} quantity must be from 1 to 6.` }
    }
    if (!Number.isInteger(frequencyPerDay) || frequencyPerDay < 1 || frequencyPerDay > 6) {
      return { ok: false, error: `${medName} frequency must be from 1 to 6 times a day.` }
    }
    if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) {
      return { ok: false, error: `${medName} duration must be from 1 to 30 days.` }
    }
    let id = cleanMedId(med?.id)
    while (seen.has(id)) id = newId()
    seen.add(id)
    medications.push({ id, name: medName, dose, quantity, frequencyPerDay, durationDays })
  }
  const equipment = (Array.isArray(input.equipment) ? input.equipment : [])
    .map((item) => asText(item, 120))
    .filter(Boolean)
    .slice(0, 12)
  let summary = asText(input.summary, 2000)
  if (!summary) {
    summary = buildSummary({
      name,
      city,
      doctorName,
      caregiverName,
      medications,
      physicalTherapy,
      equipment,
    })
  }
  return {
    ok: true,
    value: {
      name,
      phone,
      caregiverName,
      caregiverPhone,
      doctorName,
      hospitalName,
      city,
      dischargeNote,
      summary,
      medications,
      physicalTherapy,
      equipment,
    },
  }
}

function norm(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

function chartNames(facts: { name: string; doctorName: string }) {
  return { patientName: facts.name, doctorName: facts.doctorName }
}

function perDoseLabel(lang: Lang): string {
  switch (lang) {
    case 'es':
      return 'por toma'
    case 'fr':
      return 'par prise'
    case 'zh':
      return '每次'
    case 'vi':
      return 'mỗi lần'
    case 'ar':
      return 'لكل جرعة'
    default:
      return 'per dose'
  }
}

function forDurationLabel(lang: Lang): string {
  switch (lang) {
    case 'es':
      return 'por'
    case 'fr':
      return 'pendant'
    case 'zh':
      return '共'
    case 'vi':
      return 'trong'
    case 'ar':
      return 'لمدة'
    default:
      return 'for'
  }
}

export function answerQuestion(
  question: string,
  facts: {
    name: string
    caregiverName: string
    doctorName: string
    hospitalName: string
    summary: string
    physicalTherapy: string
    equipment: string[]
    medications: Medication[]
    tasks: TaskView[]
  },
  lang: Lang,
): string {
  const q = norm(question)
  if (!q) {
    switch (lang) {
      case 'es':
        return 'Escriba o dicte una pregunta.'
      case 'fr':
        return 'Saisissez ou dictez une question.'
      case 'zh':
        return '请输入或说出您的问题。'
      case 'vi':
        return 'Hãy nhập hoặc nói câu hỏi.'
      case 'ar':
        return 'اكتب أو انطق سؤالاً.'
      default:
        return 'Type or dictate a question.'
    }
  }

  const med = facts.medications.find((item) => {
    const names = [norm(item.name), ES_DRUG[norm(item.name)]].filter(Boolean)
    if (norm(item.name) === 'acetaminophen') names.push('paracetamol', 'tylenol')
    if (norm(item.name) === 'enoxaparin') names.push('lovenox')
    return names.some((name) => q.includes(name))
  })
  if (med) {
    const regimen = `${med.name} ${med.dose}: ${med.quantity} ${perDoseLabel(lang)}, ${timesPerDayLabel(med.frequencyPerDay, lang)}, ${forDurationLabel(lang)} ${durationLabel(med.durationDays, lang)}.`
    const names = chartNames(facts)
    const related = facts.tasks.filter((task) => task.kind === 'med' && task.medName === med.name)
    const open = related.find((task) => task.sentAt && !task.response)
    if (open) {
      const label =
        lang === 'es'
          ? 'Pregunta abierta'
          : lang === 'fr'
            ? 'Question en cours'
            : lang === 'zh'
              ? '待回答'
              : lang === 'vi'
                ? 'Câu hỏi đang mở'
                : lang === 'ar'
                  ? 'سؤال مفتوح'
                  : 'Open question'
      return `${regimen} ${label}: ${taskQuestionForLang(lang, open, names)}`
    }
    const upcoming = related.find((task) => !task.sentAt)
    if (upcoming) {
      const label =
        lang === 'es'
          ? 'Próximo texto'
          : lang === 'fr'
            ? 'Prochain rappel'
            : lang === 'zh'
              ? '下次提醒'
              : lang === 'vi'
                ? 'Nhắc tiếp theo'
                : lang === 'ar'
                  ? 'التذكير التالي'
                  : 'Next text'
      return `${regimen} ${label}: ${taskQuestionForLang(lang, upcoming, names)}`
    }
    return regimen
  }

  if (/(therap|ejercicio|fisio|\bpt\b|reposition|transfer|movimiento|girar|理疗|康复|vật lý)/.test(q)) {
    const empty =
      lang === 'es'
        ? 'No hay terapia en la hoja.'
        : lang === 'fr'
          ? 'Pas de thérapie sur la fiche.'
          : lang === 'zh'
            ? '计划中没有理疗内容。'
            : lang === 'vi'
              ? 'Không có vật lý trị liệu trên bảng.'
              : lang === 'ar'
                ? 'لا يوجد علاج فيزيائي في المخطط.'
                : 'No therapy is on the chart.'
    const body = facts.physicalTherapy.trim() || empty
    switch (lang) {
      case 'es':
        return `Terapia física: ${body}`
      case 'fr':
        return `Thérapie : ${body}`
      case 'zh':
        return `物理治疗：${body}`
      case 'vi':
        return `Vật lý trị liệu: ${body}`
      case 'ar':
        return `العلاج الفيزيائي: ${body}`
      default:
        return `Physical therapy: ${body}`
    }
  }

  const equipmentHit =
    /(equipment|wheelchair|cushion|bed|equipo|silla|cama|colchon|设备|轮椅|thiết bị|معدات)/.test(q) ||
    facts.equipment.some((item) =>
      norm(item)
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 4)
        .some((word) => q.includes(word)),
    )
  if (equipmentHit) {
    const list = facts.equipment.length
      ? facts.equipment.join(', ')
      : lang === 'es'
        ? 'No hay equipo en la hoja.'
        : lang === 'fr'
          ? 'Pas d’équipement sur la fiche.'
          : lang === 'zh'
            ? '计划中没有设备。'
            : lang === 'vi'
              ? 'Không có thiết bị trên bảng.'
              : lang === 'ar'
                ? 'لا توجد معدات في المخطط.'
                : 'No equipment is on the chart.'
    switch (lang) {
      case 'es':
        return `Equipo: ${list}`
      case 'fr':
        return `Équipement : ${list}`
      case 'zh':
        return `设备：${list}`
      case 'vi':
        return `Thiết bị: ${list}`
      case 'ar':
        return `المعدات: ${list}`
      default:
        return `Equipment: ${list}`
    }
  }

  const doctorToken = norm(facts.doctorName).split(' ').filter((part) => part.length > 2).at(-1) || ''
  if (/(doctor|hospital|medico|alta|discharge|医生|bác sĩ|طبيب)/.test(q) || (doctorToken && q.includes(doctorToken))) {
    switch (lang) {
      case 'es':
        return `${facts.doctorName} en ${facts.hospitalName} envió este plan para ${facts.name}.`
      case 'fr':
        return `${facts.doctorName} à ${facts.hospitalName} a envoyé ce plan pour ${facts.name}.`
      case 'zh':
        return `${facts.hospitalName} 的 ${facts.doctorName} 为 ${facts.name} 提交了此计划。`
      case 'vi':
        return `${facts.doctorName} tại ${facts.hospitalName} đã gửi kế hoạch này cho ${facts.name}.`
      case 'ar':
        return `${facts.doctorName} في ${facts.hospitalName} أرسل هذا المخطط لـ ${facts.name}.`
      default:
        return `${facts.doctorName} at ${facts.hospitalName} submitted this plan for ${facts.name}.`
    }
  }

  if (/(summ|plan|what|que debo|qué debo|cuidad|摘要|kế hoach|ملخص)/.test(q)) {
    return facts.summary
  }

  switch (lang) {
    case 'es':
      return 'Puedo responder con esta hoja: medicamentos, terapia física, equipo o el médico. No doy consejos médicos nuevos.'
    case 'fr':
      return 'Je peux répondre d’après cette fiche : médicaments, thérapie, équipement ou médecin. Pas de nouveaux conseils médicaux.'
    case 'zh':
      return '我只能根据此计划回答：药物、理疗、设备或医生信息。不能提供新的医疗建议。'
    case 'vi':
      return 'Tôi trả lời theo bảng này: thuốc, vật lý trị liệu, thiết bị hoặc bác sĩ. Không đưa lời khuyên y tế mới.'
    case 'ar':
      return 'أجيب من هذا المخطط: الأدوية، العلاج، المعدات، أو الطبيب. لا أقدم نصائح طبية جديدة.'
    default:
      return "I can answer from this chart: medications, physical therapy, equipment, or the doctor. I don't give new medical advice."
  }
}
