import { answerQuestion, clampInt, newId, parseDischarge } from './plan'
import type { AssistantFacts, Lang, Medication, ParseResult } from './types'

const MODEL = process.env.CLAUDE_MODEL?.trim() || 'claude-haiku-5-5'

const INSTRUCTIONS = `You turn a hospital discharge document into a caregiver plan.
Reply with JSON only, no markdown, using this shape:
{"name":"","phone":"","caregiverName":"","caregiverPhone":"","doctorName":"","hospitalName":"","city":"","procedure":"","physicalTherapy":"","equipment":[],"medications":[{"name":"","dose":"","quantity":1,"frequencyPerDay":1,"durationDays":1}]}
Rules:
- Use only facts written in the document. Leave unknown strings empty. Do not invent doses, phones, or names.
- phone and caregiverPhone are the numbers as written.
- doctorName is the attending, author, or discharging physician.
- procedure is the surgery or diagnosis in a short phrase.
- physicalTherapy is the therapy and activity instructions in one paragraph.
- equipment is devices named in the note, such as a walker, wheelchair, hospital bed, cane, or brace.
- Each medication needs name, dose (strength such as "600 mg"), quantity (units taken at one time, integer), frequencyPerDay, and durationDays.
- frequencyPerDay: once daily or every 24 hours = 1, every 12 hours or twice daily = 2, every 8 hours or three times daily = 3, every 6 hours or four times daily = 4, every 4 hours = 6. Cap at 6.
- If a medicine is listed without a dose or schedule, omit it.
- If duration is missing but the schedule is clear, use 7.
- Do not add commentary, notes, or warnings. Return only the fields above.`

function textField(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function useful(result: ParseResult): boolean {
  return Boolean(
    result.medications.length ||
      result.physicalTherapy ||
      result.equipment.length ||
      result.name ||
      result.caregiverName ||
      result.doctorName,
  )
}

function withWarning(result: ParseResult, warning: string): ParseResult {
  return { ...result, warnings: [warning, ...result.warnings.filter((item) => item !== warning)] }
}

export function dischargeFromModel(value: unknown): ParseResult {
  if (!value || typeof value !== 'object') {
    return {
      medications: [],
      physicalTherapy: '',
      equipment: [],
      warnings: [],
      error: 'The parser returned nothing useful.',
    }
  }
  const record = value as Record<string, unknown>
  const warnings = Array.isArray(record.warnings)
    ? record.warnings
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 240))
        .slice(0, 8)
    : []
  const medications: Medication[] = []
  const rawMeds = Array.isArray(record.medications) ? record.medications : []
  for (const item of rawMeds.slice(0, 12)) {
    if (!item || typeof item !== 'object') continue
    const med = item as Record<string, unknown>
    const name = textField(med.name, 80)
    const dose = textField(med.dose, 40)
    if (!name || !dose) {
      if (name) warnings.push(`${name} was skipped because the dose or schedule was unclear.`)
      continue
    }
    const quantityRaw = Number(med.quantity)
    const frequencyRaw = Number(med.frequencyPerDay)
    const durationRaw = Number(med.durationDays)
    const quantity = clampInt(Number.isFinite(quantityRaw) && quantityRaw >= 1 ? quantityRaw : 1, 1, 6)
    const frequencyPerDay = clampInt(Number.isFinite(frequencyRaw) && frequencyRaw >= 1 ? frequencyRaw : 1, 1, 6)
    const durationDays = clampInt(Number.isFinite(durationRaw) && durationRaw >= 1 ? durationRaw : 7, 1, 30)
    if (!(Number.isFinite(frequencyRaw) && frequencyRaw >= 1)) warnings.push(`${name} had no schedule. Set to once a day.`)
    if (!(Number.isFinite(durationRaw) && durationRaw >= 1)) warnings.push(`${name} had no duration. Set to 7 days.`)
    const adjusted =
      (Number.isFinite(quantityRaw) && quantity !== Math.round(quantityRaw)) ||
      (Number.isFinite(frequencyRaw) && frequencyPerDay !== Math.round(frequencyRaw)) ||
      (Number.isFinite(durationRaw) && durationDays !== Math.round(durationRaw))
    if (adjusted) warnings.push(`${name} was adjusted to fit the sliders.`)
    medications.push({ id: newId(), name, dose, quantity, frequencyPerDay, durationDays })
  }
  const equipment = (Array.isArray(record.equipment) ? record.equipment : [])
    .map((item) => textField(item, 120))
    .filter(Boolean)
    .slice(0, 12)
  const physicalTherapy = textField(record.physicalTherapy, 2000)
  const name = textField(record.name, 80)
  const caregiverName = textField(record.caregiverName, 80)
  const doctorName = textField(record.doctorName, 80)
  const identity = Boolean(name || caregiverName || doctorName || textField(record.caregiverPhone, 30))
  if (!medications.length && (identity || physicalTherapy || equipment.length)) {
    warnings.push('No medication doses were in the document. Add each medicine before submitting.')
  }
  if (!medications.length && !physicalTherapy && !equipment.length && !identity) {
    return {
      medications: [],
      physicalTherapy: '',
      equipment: [],
      warnings,
      error: 'This document had no medications, therapy, or equipment.',
    }
  }
  return {
    medications,
    physicalTherapy,
    equipment,
    warnings,
    name: name || undefined,
    phone: textField(record.phone, 30) || undefined,
    caregiverName: caregiverName || undefined,
    caregiverPhone: textField(record.caregiverPhone, 30) || undefined,
    doctorName: doctorName || undefined,
    hospitalName: textField(record.hospitalName, 120) || undefined,
    city: textField(record.city, 80) || undefined,
    procedure: textField(record.procedure, 180) || undefined,
  }
}

function readModelJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed
  return JSON.parse(slice)
}

async function callClaude(note: string, key: string): Promise<ParseResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: INSTRUCTIONS,
      messages: [{ role: 'user', content: note }],
    }),
    signal: AbortSignal.timeout(30_000),
  })
  const payload = (await response.json()) as {
    content?: { type?: string; text?: string }[]
    error?: { message?: string }
  }
  if (!response.ok) {
    const message = payload.error?.message || 'Claude rejected the request.'
    throw new Error(message)
  }
  const content = payload.content
    ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim()
  if (!content) throw new Error('Claude returned an empty plan.')
  return dischargeFromModel(readModelJson(content))
}

const VOICE_LANG: Record<Lang, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  zh: 'Chinese (Simplified)',
  vi: 'Vietnamese',
  ar: 'Arabic',
}

export function limitSentences(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (!trimmed) return trimmed
  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [trimmed]
  return parts.slice(0, max).join(' ').trim()
}

function chartForVoice(facts: AssistantFacts): string {
  return JSON.stringify({
    patient: facts.name,
    caregiver: facts.caregiverName,
    doctor: facts.doctorName,
    hospital: facts.hospitalName,
    city: facts.city,
    summary: facts.summary,
    physicalTherapy: facts.physicalTherapy,
    equipment: facts.equipment,
    medications: facts.medications.map((med) => ({
      name: med.name,
      dose: med.dose,
      quantity: med.quantity,
      timesPerDay: med.frequencyPerDay,
      durationDays: med.durationDays,
    })),
    openQuestions: facts.tasks
      .filter((task) => task.sentAt && !task.response)
      .map((task) => task.questionEn),
    upcomingReminders: facts.tasks
      .filter((task) => !task.sentAt)
      .slice(0, 6)
      .map((task) => task.questionEn),
  })
}

async function callClaudeVoice(facts: AssistantFacts, question: string, lang: Lang, key: string): Promise<string> {
  const language = VOICE_LANG[lang] ?? 'English'
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 220,
      system: `You help a family caregiver during the first 72 hours after hospital discharge.
Use ONLY the JSON chart. Reply in ${language}.
Use at most 3 short sentences total.
If the chart does not contain enough information, say what is missing and why you cannot answer—still within 3 sentences.
Do not invent doses, times, doctors, or medical advice beyond the chart.`,
      messages: [
        {
          role: 'user',
          content: `Chart:\n${chartForVoice(facts)}\n\nCaregiver question:\n${question}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(25_000),
  })
  const payload = (await response.json()) as {
    content?: { type?: string; text?: string }[]
    error?: { message?: string }
  }
  if (!response.ok) {
    const message = payload.error?.message || 'Claude rejected the request.'
    throw new Error(message)
  }
  const content = payload.content
    ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim()
  if (!content) throw new Error('Claude returned an empty answer.')
  return limitSentences(content, 3)
}

export async function answerCaregiverQuestion(
  facts: AssistantFacts,
  question: string,
  lang: Lang,
): Promise<string> {
  const q = question.trim()
  if (!q) {
    return lang === 'es'
      ? 'No escuché una pregunta.'
      : lang === 'fr'
        ? 'Je n’ai pas entendu de question.'
        : 'I did not hear a question.'
  }
  const key = (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY)?.trim()
  if (!key) {
    const fallbackLang = lang === 'es' ? 'es' : 'en'
    const local = answerQuestion(q, facts, fallbackLang)
    const prefix =
      lang !== 'en' && lang !== 'es'
        ? 'No AI key is set; answering in English from the chart. '
        : ''
    return limitSentences(prefix + local, 3)
  }
  try {
    return await callClaudeVoice(facts, q, lang, key)
  } catch {
    const fallbackLang = lang === 'es' ? 'es' : 'en'
    const local = answerQuestion(q, facts, fallbackLang)
    return limitSentences(
      lang === 'es'
        ? `No pude contactar a Claude. ${local}`
        : lang === 'fr'
          ? `Claude est indisponible. ${local}`
          : `Claude could not be reached. ${local}`,
      3,
    )
  }
}

export async function parseDischargeText(note: string): Promise<ParseResult> {
  const text = note.trim().slice(0, 20000)
  if (!text) {
    return { medications: [], physicalTherapy: '', equipment: [], warnings: [], error: 'No text found in that document.' }
  }
  const key = (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY)?.trim()
  if (!key) {
    return withWarning(parseDischarge(text), 'No Claude API key is set, so the built-in reader was used.')
  }
  try {
    const modeled = await callClaude(text, key)
    if (useful(modeled)) return modeled
    const fallback = parseDischarge(text)
    if (useful(fallback)) {
      return withWarning(fallback, 'The model did not find a plan, so the built-in reader was used.')
    }
    return modeled.error ? modeled : fallback
  } catch {
    return withWarning(parseDischarge(text), 'Claude could not be reached, so the built-in reader was used.')
  }
}
