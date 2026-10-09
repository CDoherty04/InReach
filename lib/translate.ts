import 'server-only'
import { createHash } from 'node:crypto'
import type { Lang } from './types'

const MODEL = process.env.CLAUDE_MODEL?.trim() || 'claude-haiku-5-5'

const TARGET_LANG: Record<Lang, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  zh: 'Chinese (Simplified)',
  vi: 'Vietnamese',
  ar: 'Arabic',
}

export type CareSource = {
  summary: string
  physicalTherapy: string
  equipment: string[]
}

export type CareTranslation = CareSource

export function careContentHash(source: CareSource): string {
  return createHash('sha256')
    .update(JSON.stringify(source))
    .digest('hex')
    .slice(0, 20)
}

function readJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed
  return JSON.parse(slice)
}

function asText(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function normalizeCareTranslation(value: unknown, fallback: CareSource): CareTranslation {
  if (!value || typeof value !== 'object') return fallback
  const record = value as Record<string, unknown>
  const equipment = Array.isArray(record.equipment)
    ? record.equipment.map((item) => asText(item, 120)).filter(Boolean).slice(0, 12)
    : fallback.equipment
  return {
    summary: asText(record.summary, 4000) || fallback.summary,
    physicalTherapy: asText(record.physicalTherapy, 2000) || fallback.physicalTherapy,
    equipment: equipment.length ? equipment : fallback.equipment,
  }
}

export async function translateCareContent(lang: Lang, source: CareSource): Promise<CareTranslation> {
  if (lang === 'en') return source
  const key = (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY)?.trim()
  if (!key) return source

  const language = TARGET_LANG[lang] ?? 'English'
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2200,
      system: `You translate hospital discharge caregiver text into ${language}.
Return JSON only, no markdown, with keys summary, physicalTherapy, equipment (string array).
Keep medication names, doctor names, cities, and numbers/doses accurate. Use natural ${language} for instructions.`,
      messages: [
        {
          role: 'user',
          content: JSON.stringify(source),
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  })

  const payload = (await response.json()) as {
    content?: { type?: string; text?: string }[]
    error?: { message?: string }
  }
  if (!response.ok) return source
  const content = payload.content
    ?.filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim()
  if (!content) return source
  try {
    return normalizeCareTranslation(readJson(content), source)
  } catch {
    return source
  }
}
