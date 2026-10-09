import { NextResponse } from 'next/server'
import { handleTelegramUpdate } from '@/lib/telegram'
import { linkTelegramChat, ready, rememberDemoTelegramChat } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET
  const header = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
  if (secret && header !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await ready()
  const update = (await request.json()) as Parameters<typeof handleTelegramUpdate>[0]
  await handleTelegramUpdate(update, linkTelegramChat, rememberDemoTelegramChat)
  return NextResponse.json({ ok: true })
}
