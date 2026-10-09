import 'server-only'
import { isFictionalPhone, sendSms, type SmsResult } from '@/lib/sms'
import { sendTelegramMessage, telegramConfigured } from '@/lib/telegram'

export type DeliveryResult = SmsResult

type ReminderPatient = {
  telegramChatIds?: string[]
  phone: string
  caregiverPhone: string
}

function smsRecipients(patient: ReminderPatient): string[] {
  const phones: string[] = []
  const seen = new Set<string>()
  for (const phone of [patient.caregiverPhone, patient.phone]) {
    const key = phone.replace(/\D/g, '')
    if (!key || seen.has(key)) continue
    seen.add(key)
    phones.push(phone)
  }
  return phones
}

export async function deliverReminder(
  patient: ReminderPatient,
  body: string,
  demoChatId?: string | null,
): Promise<DeliveryResult[]> {
  if (telegramConfigured()) {
    const chatIds = demoChatId
      ? [demoChatId]
      : [...new Set((patient.telegramChatIds ?? []).map(String).filter(Boolean))]
    if (!chatIds.length) {
      return [{ to: 'Telegram', skipped: 'Message @InReach72HoursBot once ( /start ) to register your demo chat.' }]
    }
    const results: DeliveryResult[] = []
    for (const chatId of chatIds) results.push(await sendTelegramMessage(chatId, body))
    return results
  }
  const phones = smsRecipients(patient)
  if (!phones.length) return [{ to: 'SMS', skipped: 'No phone numbers on the chart.' }]
  const results: DeliveryResult[] = []
  for (const phone of phones) results.push(await sendSms(phone, body))
  return results
}

export function deliveryNote(results: DeliveryResult[] | undefined, phones?: string[]): string | null {
  if (!telegramConfigured() && phones?.length && phones.every(isFictionalPhone)) {
    return 'Demo numbers are not texted.'
  }
  if (!results?.length) return null
  const notes: string[] = []
  for (const result of results) {
    if ('sid' in result) continue
    if ('skipped' in result) {
      if (result.skipped === 'fictional demo number') notes.push('Demo numbers are not texted.')
      else if (result.skipped === 'Twilio not configured') notes.push('SMS is not configured, so this stayed in the app.')
      else notes.push(result.skipped)
      continue
    }
    if (result.error.includes('predefined SMS templates')) {
      notes.push('Twilio trial blocked this text. Use Telegram or upgrade Twilio.')
    } else if (/verified/i.test(result.error)) {
      notes.push('That number is not a verified recipient on the Twilio trial.')
    } else if (/Primary compliance profile/i.test(result.error)) {
      notes.push('Twilio needs an approved Trust Hub profile. Use Telegram instead.')
    } else {
      notes.push(result.error)
    }
  }
  const unique = [...new Set(notes)]
  return unique.length ? unique.join(' ') : null
}
