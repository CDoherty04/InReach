import 'server-only'

export type SmsResult =
  | { to: string; sid: string }
  | { to: string; error: string }
  | { to: string; skipped: string }

function digitsOf(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function toE164(phone: string): string | null {
  const d = digitsOf(phone)
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return null
}

// Reserved fictional US range: 555-0100 through 555-0199. Never texts the demo numbers.
export function isFictionalPhone(phone: string): boolean {
  const d = digitsOf(phone)
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d
  return /^\d{3}55501\d{2}$/.test(ten)
}

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID),
  )
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!smsConfigured()) return { to, skipped: 'Twilio not configured' }
  if (isFictionalPhone(to)) return { to, skipped: 'fictional demo number' }
  const e164 = toE164(to)
  if (!e164) return { to, error: 'Not a 10-digit US number' }

  const sid = process.env.TWILIO_ACCOUNT_SID as string
  const token = process.env.TWILIO_AUTH_TOKEN as string
  const params = new URLSearchParams()
  params.set('To', e164)
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set('MessagingServiceSid', process.env.TWILIO_MESSAGING_SERVICE_SID)
  } else {
    params.set('From', process.env.TWILIO_FROM as string)
  }
  params.set('Body', body)

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    const data = (await response.json().catch(() => ({}))) as { sid?: string; message?: string }
    if (!response.ok) return { to, error: data.message || `Twilio error ${response.status}` }
    return { to, sid: data.sid || 'sent' }
  } catch (error) {
    return { to, error: error instanceof Error ? error.message : 'Twilio request failed' }
  }
}
