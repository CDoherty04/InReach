'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parseDischargeText } from '@/lib/ai'
import { isPatientId } from '@/lib/plan'
import type { ParseResult, Prefs, SavePatientInput } from '@/lib/types'
import {
  beginHospitalCheckout,
  payHospitalOrder,
  respondToTask,
  savePatient,
  savePrefs,
  sendNextText,
} from '@/lib/store'

function refreshPatient(id: string) {
  revalidatePath('/doctor')
  revalidatePath('/sms')
  revalidatePath('/doctor/orders')
  revalidatePath(`/doctor/patients/${id}`)
  revalidatePath(`/p/${id}`)
}

export async function extractUploadAction(
  formData: FormData,
): Promise<{ text: string; parsed: ParseResult } | { error: string }> {
  const file = formData.get('file')
  if (!(file instanceof File) || file.size < 1) return { error: 'Choose a PDF.' }
  if (file.size > 8_000_000) return { error: 'Keep the PDF under 8 MB.' }
  const name = file.name.toLowerCase()
  if (file.type !== 'application/pdf' && !name.endsWith('.pdf')) return { error: 'Upload a PDF.' }
  try {
    const { extractText } = await import('unpdf')
    const extracted = await extractText(new Uint8Array(await file.arrayBuffer()), { mergePages: true })
    const raw = Array.isArray(extracted.text) ? extracted.text.join('\n') : String(extracted.text || '')
    const text = raw.replace(/--\s*\d+\s+of\s+\d+\s*--/g, '\n').trim().slice(0, 20000)
    if (!text) return { error: 'No text found in that PDF.' }
    return { text, parsed: await parseDischargeText(text) }
  } catch {
    return { error: 'Could not read that PDF.' }
  }
}

export async function parseNoteAction(note: string): Promise<{ parsed: ParseResult } | { error: string }> {
  const text = String(note || '').trim()
  if (!text) return { error: 'Add a discharge note first.' }
  return { parsed: await parseDischargeText(text.slice(0, 20000)) }
}

export async function savePatientAction(
  input: SavePatientInput,
): Promise<{ error: string } | { ok: true; href?: string }> {
  const result = await savePatient(input)
  if ('error' in result) return result
  refreshPatient(result.id)
  if (input.intent === 'submit') return { ok: true, href: `/sms?patient=${result.id}` }
  if (!input.id) return { ok: true, href: `/doctor/patients/${result.id}` }
  return { ok: true }
}

export async function respondAction(formData: FormData) {
  const taskId = String(formData.get('taskId') || '')
  const answer = String(formData.get('answer') || '')
  const patientId = String(formData.get('patientId') || '')
  await respondToTask(taskId, answer)
  if (isPatientId(patientId)) revalidatePath(`/p/${patientId}`)
  revalidatePath('/sms')
}

export async function startCheckoutAction(formData: FormData) {
  const orderId = String(formData.get('orderId') || '')
  const result = await beginHospitalCheckout(orderId)
  if ('error' in result) redirect(`/doctor/orders?error=${encodeURIComponent(result.error)}`)
  redirect(result.url)
}

export async function payAction(formData: FormData) {
  const result = await payHospitalOrder({
    orderId: String(formData.get('orderId') || ''),
    method: String(formData.get('method') || ''),
    card: String(formData.get('card') || ''),
    expiry: String(formData.get('expiry') || ''),
    cvc: String(formData.get('cvc') || ''),
  })
  revalidatePath('/doctor/orders')
  if ('error' in result) redirect(`/doctor/orders?error=${encodeURIComponent(result.error)}`)
  redirect('/doctor/orders?paid=1')
}

export async function sendNextAction(formData: FormData) {
  const patientId = String(formData.get('patientId') || '')
  const result = await sendNextText(patientId)
  if (isPatientId(patientId)) {
    refreshPatient(patientId)
    revalidatePath('/doctor')
  }
  if ('error' in result && isPatientId(patientId)) {
    redirect(`/doctor/patients/${patientId}?error=${encodeURIComponent(result.error)}`)
  }
  if ('ok' in result && isPatientId(patientId)) {
    redirect(`/sms?patient=${patientId}`)
  }
}

export async function updatePrefsAction(patientId: string, prefs: Prefs) {
  await savePrefs(patientId, prefs)
  if (isPatientId(patientId)) revalidatePath(`/p/${patientId}`)
}
