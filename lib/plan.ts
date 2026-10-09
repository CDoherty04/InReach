import type { Medication, ParseResult, PlanFields, Prefs, TaskDraft, TaskView } from './types'

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
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const ES_DRUG: Record<string, string> = {
  ibuprofen: 'ibuprofeno',
  acetaminophen: 'acetaminofén',
  enoxaparin: 'enoxaparina',
}

const MED_LINE =
  /^(.+?)\s*\|\s*(.+?)\s*\|\s*qty\s+(\d+)\s*\|\s*every\s+(\d+)\s*hours?\s*\|\s*(\d+)\s*days?$/i

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

export function formatClock(hour: number, minute: number, lang: 'en' | 'es'): string {
  const ampm = hour >= 12 ? (lang === 'es' ? 'p.m.' : 'PM') : lang === 'es' ? 'a.m.' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const minutes = String(minute).padStart(2, '0')
  return `${hour12}:${minutes} ${ampm}`
}

export function formatWhen(date: Date, lang: 'en' | 'es'): string {
  const parts = chicagoParts(date)
  const weekday = weekdayIndex(parts.year, parts.month, parts.day)
  const time = formatClock(parts.hour, parts.minute, lang)
  if (lang === 'es') {
    return `${time} del ${WEEKDAYS_ES[weekday]}, ${parts.day} ${MONTHS_ES[parts.month - 1]}`
  }
  return `${time} on ${WEEKDAYS_EN[weekday]}, ${MONTHS_EN[parts.month - 1]} ${parts.day}`
}

export function formatStamp(date: Date): string {
  const parts = chicagoParts(date)
  return `${MONTHS_EN[parts.month - 1]} ${parts.day}, ${formatClock(parts.hour, parts.minute, 'en')}`
}

export function timesPerDayLabel(count: number, lang: 'en' | 'es'): string {
  const n = clampInt(count, 1, 6)
  if (lang === 'es') return n === 1 ? '1 vez al día' : `${n} veces al día`
  return n === 1 ? '1 time a day' : `${n} times a day`
}

export function durationLabel(days: number, lang: 'en' | 'es'): string {
  const n = clampInt(days, 1, 30)
  if (lang === 'es') return n === 1 ? '1 día' : `${n} días`
  return n === 1 ? '1 day' : `${n} days`
}

export function clockPreview(frequency: number, lang: 'en' | 'es' = 'en'): string {
  const hours = CLOCK[clampInt(frequency, 1, 6)]
  const labels = hours.map((hour) => formatClock(hour, 0, lang))
  const join = lang === 'es' ? ' y ' : ' and '
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]}${join}${labels[1]}`
  const head = labels.slice(0, -1).join(', ')
  const tail = labels[labels.length - 1]
  return lang === 'es' ? `${head} y ${tail}` : `${head}, and ${tail}`
}

function drugName(name: string, lang: 'en' | 'es'): string {
  const lower = name.trim().toLowerCase()
  if (lang === 'es' && ES_DRUG[lower]) return ES_DRUG[lower]
  return lower
}

export function medQuestion(medName: string, whenLabel: string, lang: 'en' | 'es'): string {
  const name = drugName(medName, lang)
  if (lang === 'es') return `¿Ya tomó su ${name} a las ${whenLabel}?`
  return `Have they taken their ${name} at ${whenLabel}?`
}

export function verifyQuestion(doctorName: string, patientName: string, lang: 'en' | 'es'): string {
  if (lang === 'es') return `¿${doctorName} es quien dio el alta de ${patientName}?`
  return `Is ${doctorName} the doctor for ${patientName}'s discharge?`
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
  lines.push('', `Patient page: ${input.href}`)
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
  const warnings: string[] = []
  const medications: Medication[] = []
  const therapy: string[] = []
  const equipment: string[] = []
  let section: 'none' | 'meds' | 'pt' | 'eq' = 'none'

  for (const raw of note.split('\n')) {
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
      const parsed = parseMedicationLine(item)
      if ('error' in parsed) warnings.push(parsed.error)
      else {
        medications.push(parsed.med)
        if (parsed.warning) warnings.push(parsed.warning)
      }
    } else if (section === 'pt') {
      therapy.push(item)
    } else if (section === 'eq' && item) {
      equipment.push(item)
    }
  }

  const chart = chartFields(note)
  const narrative = narrativePlan(note)
  const physicalTherapy = therapy.join(' ') || narrative.physicalTherapy
  const listedEquipment = equipment.length ? equipment : narrative.equipment
  const name = chart.name
  const caregiverName = chart['primary caregiver'] ? caregiverFromChart(chart['primary caregiver']) : undefined
  const caregiverPhone = chart['caregiver phone']
  const phone = chart['patient phone'] || chart['patient mobile']
  const doctorName = chart.author || chart.attending || chart.physician || chart.doctor
  const hospitalName = chart.hospital
  const city = chart.city
  const procedure = chart.procedure
  const identity = Boolean(name || caregiverName || doctorName || caregiverPhone)

  if (!medications.length && (identity || physicalTherapy || listedEquipment.length)) {
    warnings.push('No medication doses were in the document. Add each medicine before submitting.')
  }

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
  lang: 'en' | 'es',
): string {
  const q = norm(question)
  if (!q) return lang === 'es' ? 'Escriba o dicte una pregunta.' : 'Type or dictate a question.'

  const med = facts.medications.find((item) => {
    const names = [norm(item.name), ES_DRUG[norm(item.name)]].filter(Boolean)
    if (norm(item.name) === 'acetaminophen') names.push('paracetamol', 'tylenol')
    if (norm(item.name) === 'enoxaparin') names.push('lovenox')
    return names.some((name) => q.includes(name))
  })
  if (med) {
    const regimen =
      lang === 'es'
        ? `${med.name} ${med.dose}: ${med.quantity} por toma, ${timesPerDayLabel(med.frequencyPerDay, 'es')}, por ${durationLabel(med.durationDays, 'es')}.`
        : `${med.name} ${med.dose}: ${med.quantity} per dose, ${timesPerDayLabel(med.frequencyPerDay, 'en')}, for ${durationLabel(med.durationDays, 'en')}.`
    const related = facts.tasks.filter((task) => task.kind === 'med' && task.medName === med.name)
    const open = related.find((task) => task.sentAt && !task.response)
    if (open) {
      const label = lang === 'es' ? 'Pregunta abierta' : 'Open question'
      return `${regimen} ${label}: ${lang === 'es' ? open.questionEs : open.questionEn}`
    }
    const upcoming = related.find((task) => !task.sentAt)
    if (upcoming) {
      const label = lang === 'es' ? 'Próximo texto' : 'Next text'
      return `${regimen} ${label}: ${lang === 'es' ? upcoming.questionEs : upcoming.questionEn}`
    }
    return regimen
  }

  if (/(therap|ejercicio|fisio|\bpt\b|reposition|transfer|movimiento|girar)/.test(q)) {
    const body = facts.physicalTherapy.trim() || (lang === 'es' ? 'No hay terapia en la hoja.' : 'No therapy is on the chart.')
    return lang === 'es' ? `Terapia física: ${body}` : `Physical therapy: ${body}`
  }

  const equipmentHit =
    /(equipment|wheelchair|cushion|bed|equipo|silla|cama|colchon)/.test(q) ||
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
        : 'No equipment is on the chart.'
    return lang === 'es' ? `Equipo: ${list}` : `Equipment: ${list}`
  }

  const doctorToken = norm(facts.doctorName).split(' ').filter((part) => part.length > 2).at(-1) || ''
  if (/(doctor|hospital|medico|alta|discharge)/.test(q) || (doctorToken && q.includes(doctorToken))) {
    return lang === 'es'
      ? `${facts.doctorName} en ${facts.hospitalName} envió este plan para ${facts.name}.`
      : `${facts.doctorName} at ${facts.hospitalName} submitted this plan for ${facts.name}.`
  }

  if (/(summ|plan|what|que debo|qué debo|cuidad)/.test(q)) {
    return facts.summary
  }

  return lang === 'es'
    ? 'Puedo responder con esta hoja: medicamentos, terapia física, equipo o el médico. No doy consejos médicos nuevos.'
    : "I can answer from this chart: medications, physical therapy, equipment, or the doctor. I don't give new medical advice."
}
