import 'server-only'
import { isPatientId } from '@/lib/plan'

export type TelegramSendResult =
  | { to: string; sid: string }
  | { to: string; error: string }
  | { to: string; skipped: string }

const globalForBot = globalThis as typeof globalThis & {
  __inreachBotUser?: string | null
  __telegramOffset?: number
}

/** Local dev: Telegram cannot POST to localhost, so we poll getUpdates instead of a webhook. */
export function telegramPollingMode(): boolean {
  if (!telegramConfigured() || process.env.VERCEL) return false
  if (process.env.TELEGRAM_USE_POLLING === '0') return false
  if (process.env.TELEGRAM_USE_POLLING === '1') return true
  return process.env.NODE_ENV === 'development'
}

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN)
}

export function telegramConnectUrl(patientId: string, botUsername: string | null): string | null {
  if (!botUsername || !isPatientId(patientId)) return null
  return `https://t.me/${botUsername}?start=${encodeURIComponent(patientId)}`
}

export async function telegramBotUsername(): Promise<string | null> {
  if (globalForBot.__inreachBotUser !== undefined) return globalForBot.__inreachBotUser
  const fromEnv = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '').trim()
  if (fromEnv) {
    globalForBot.__inreachBotUser = fromEnv
    return fromEnv
  }
  if (!telegramConfigured()) {
    globalForBot.__inreachBotUser = null
    return null
  }
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN as string
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const data = (await response.json()) as { ok?: boolean; result?: { username?: string } }
    const username = data.ok && data.result?.username ? data.result.username : null
    globalForBot.__inreachBotUser = username
    return username
  } catch {
    globalForBot.__inreachBotUser = null
    return null
  }
}

export async function sendTelegramMessage(chatId: string, body: string): Promise<TelegramSendResult> {
  const label = `Telegram ${chatId}`
  if (!telegramConfigured()) return { to: label, skipped: 'Telegram bot not configured' }
  const token = process.env.TELEGRAM_BOT_TOKEN as string
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: body }),
    })
    const data = (await response.json()) as { ok?: boolean; description?: string; result?: { message_id?: number } }
    if (!response.ok || !data.ok) return { to: label, error: data.description || `Telegram error ${response.status}` }
    return { to: label, sid: String(data.result?.message_id ?? 'sent') }
  } catch (error) {
    return { to: label, error: error instanceof Error ? error.message : 'Telegram request failed' }
  }
}

type TelegramUpdate = {
  message?: {
    text?: string
    chat?: { id?: number }
  }
}

function patientIdFromText(text: string): string | null {
  const trimmed = text.trim()
  const start = trimmed.match(/^\/start(?:@\w+)?(?:\s+(\S+))?/i)
  if (start?.[1] && isPatientId(start[1])) return start[1]
  const link = trimmed.match(/^link(?:@\w+)?\s+(\S+)/i)
  if (link?.[1] && isPatientId(link[1])) return link[1]
  return null
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  linkChat: (patientId: string, chatId: string) => Promise<void>,
  rememberDemo?: (chatId: string) => Promise<void>,
): Promise<void> {
  const message = update.message
  if (!message?.text || message.chat?.id == null) return
  const chatId = String(message.chat.id)
  await rememberDemo?.(chatId)
  const patientId = patientIdFromText(message.text)
  if (!patientId) {
    if (/^\/start/i.test(message.text.trim())) {
      await sendTelegramMessage(
        chatId,
        'Demo Telegram linked. All InReach reminders will come to this chat. Submit or send a dose from the doctor chart.',
      )
    }
    return
  }
  await linkChat(patientId, chatId)
  await sendTelegramMessage(
    chatId,
    'You are connected to InReach. Medication reminders will arrive here with a link to the patient page.',
  )
}

export async function telegramWebhookInfo(): Promise<{ url: string; lastErrorMessage?: string } | null> {
  if (!telegramConfigured()) return null
  const token = process.env.TELEGRAM_BOT_TOKEN as string
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
    const data = (await response.json()) as {
      ok?: boolean
      result?: { url?: string; last_error_message?: string }
    }
    if (!data.ok || !data.result) return null
    return { url: data.result.url || '', lastErrorMessage: data.result.last_error_message }
  } catch {
    return null
  }
}

export async function deleteTelegramWebhook(): Promise<void> {
  if (!telegramConfigured()) return
  const token = process.env.TELEGRAM_BOT_TOKEN as string
  await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: 'POST' })
}

export async function pollTelegramUpdates(
  linkChat: (patientId: string, chatId: string) => Promise<void>,
  rememberDemo?: (chatId: string) => Promise<void>,
): Promise<void> {
  if (!telegramPollingMode()) return
  const token = process.env.TELEGRAM_BOT_TOKEN as string
  const offset = globalForBot.__telegramOffset ?? 0
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?timeout=0&offset=${offset}&allowed_updates=${encodeURIComponent(JSON.stringify(['message']))}`,
    )
    const data = (await response.json()) as { ok?: boolean; result?: Array<TelegramUpdate & { update_id: number }> }
    if (!data.ok || !data.result?.length) return
    for (const update of data.result) {
      globalForBot.__telegramOffset = update.update_id + 1
      await handleTelegramUpdate(update, linkChat, rememberDemo)
    }
  } catch {
    // Next poll will retry.
  }
}

export async function ensureTelegramWebhook(publicBaseUrl: string): Promise<boolean> {
  if (!telegramConfigured() || !publicBaseUrl.startsWith('https://')) return false
  const token = process.env.TELEGRAM_BOT_TOKEN as string
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET
  const url = `${publicBaseUrl.replace(/\/$/, '')}/api/telegram`
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        secret_token: secret || undefined,
        allowed_updates: ['message'],
      }),
    })
    const data = (await response.json()) as { ok?: boolean }
    return Boolean(data.ok)
  } catch {
    return false
  }
}
