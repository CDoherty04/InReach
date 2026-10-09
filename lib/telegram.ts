import 'server-only'
import { isPatientId } from '@/lib/plan'

export type TelegramSendResult =
  | { to: string; sid: string }
  | { to: string; error: string }
  | { to: string; skipped: string }

const globalForBot = globalThis as typeof globalThis & { __inreachBotUser?: string | null }

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

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  linkChat: (patientId: string, chatId: string) => Promise<void>,
): Promise<void> {
  const message = update.message
  if (!message?.text || message.chat?.id == null) return
  const match = message.text.trim().match(/^\/start(?:@\w+)?(?:\s+(\S+))?/)
  const patientId = match?.[1]
  if (!patientId || !isPatientId(patientId)) return
  const chatId = String(message.chat.id)
  await linkChat(patientId, chatId)
  await sendTelegramMessage(
    chatId,
    'You are connected to InReach. Medication reminders will arrive here with a link to the patient page.',
  )
}

export async function ensureTelegramWebhook(publicBaseUrl: string): Promise<void> {
  if (!telegramConfigured() || !publicBaseUrl.startsWith('https://')) return
  const token = process.env.TELEGRAM_BOT_TOKEN as string
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET
  const url = `${publicBaseUrl.replace(/\/$/, '')}/api/telegram`
  const params = new URLSearchParams({ url })
  if (secret) params.set('secret_token', secret)
  await fetch(`https://api.telegram.org/bot${token}/setWebhook?${params.toString()}`)
}
