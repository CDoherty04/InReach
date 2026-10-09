import { NextResponse } from 'next/server'
import { ready } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (secret && header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.VERCEL && !secret) {
    return NextResponse.json({ error: 'Set CRON_SECRET.' }, { status: 401 })
  }
  await ready()
  return NextResponse.json({ ok: true })
}
