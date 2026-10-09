import 'server-only'
import type { Db } from 'mongodb'
import { baseUrl, getDb } from '@/lib/db'
import {
  ANNUAL_RATE_CENTS,
  DEMO,
  SAMPLE_NOTE,
  buildSummary,
  buildTasks,
  cardError,
  defaultPrefs,
  demoDischargeAt,
  englishSms,
  formatStamp,
  formatWhen,
  isPatientId,
  parseDischarge,
  patientPath,
  presentTask,
  sanitizePrefs,
  slugify,
  validatePlan,
} from '@/lib/plan'
import { checkoutOrderId, createCheckoutUrl } from '@/lib/payments'
import { deliverReminder, deliveryNote, type DeliveryResult } from '@/lib/delivery'
import { ensureTelegramWebhook, telegramBotUsername, telegramConnectUrl, telegramConfigured } from '@/lib/telegram'
import type {
  DoctorPatient,
  MessageView,
  OrderView,
  PatientListItem,
  PatientPageData,
  PlanFields,
  Prefs,
  SavePatientInput,
  ScheduledView,
  TaskDraft,
  TaskView,
  ThreadView,
} from '@/lib/types'

type PatientDoc = {
  _id: string
  name: string
  phone: string
  caregiverName: string
  caregiverPhone: string
  doctorName: string
  hospitalName: string
  city: string
  scenario: string | null
  dischargeNote: string
  summary: string
  medications: PlanFields['medications']
  physicalTherapy: string
  equipment: string[]
  status: 'draft' | 'active'
  dischargeAt: Date | null
  prefs: Prefs
  telegramChatIds?: string[]
  seedComplete?: boolean
  createdAt: Date
  updatedAt: Date
}

type TaskDoc = {
  _id: string
  patientId: string
  kind: 'verify' | 'med'
  medName: string | null
  dose: string | null
  quantity: number | null
  scheduledFor: Date
  sentAt: Date | null
  response: 'yes' | 'no' | null
  respondedAt: Date | null
}

type MessageDoc = {
  _id: string
  patientId: string
  toPhones: string[]
  body: string
  href: string
  taskId: string
  sentAt: Date
  sms?: DeliveryResult[]
}

type OrderDoc = {
  _id: string
  patientId: string
  patientName: string
  hospitalName: string
  description: string
  amountCents: number
  status: 'pending' | 'paid'
  method: 'card' | 'link' | 'stripe' | null
  last4: string | null
  createdAt: Date
  paidAt: Date | null
}

function subscriptionOrderId(hospitalName: string): string {
  return `sub:${slugify(hospitalName)}`
}

const SUBSCRIPTION_DESCRIPTION = 'Annual caregiver portal subscription'

const globalForApp = globalThis as typeof globalThis & {
  __seventyTwoTimer?: ReturnType<typeof setInterval>
  __seventyTwoIndexed?: boolean
}

function isDup(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000
}

function patientCol(db: Db) {
  return db.collection<PatientDoc>('patients')
}
function taskCol(db: Db) {
  return db.collection<TaskDoc>('tasks')
}
function messageCol(db: Db) {
  return db.collection<MessageDoc>('messages')
}
function orderCol(db: Db) {
  return db.collection<OrderDoc>('orders')
}
function metaCol(db: Db) {
  return db.collection<{ _id: string; at: Date }>('meta')
}

function fieldsOf(patient: PatientDoc): PlanFields {
  return {
    name: patient.name,
    phone: patient.phone,
    caregiverName: patient.caregiverName,
    caregiverPhone: patient.caregiverPhone,
    doctorName: patient.doctorName,
    hospitalName: patient.hospitalName,
    city: patient.city,
    dischargeNote: patient.dischargeNote,
    summary: patient.summary,
    medications: patient.medications,
    physicalTherapy: patient.physicalTherapy,
    equipment: patient.equipment,
  }
}

function toTaskDoc(draft: TaskDraft): TaskDoc {
  return {
    _id: draft.id,
    patientId: draft.patientId,
    kind: draft.kind,
    medName: draft.medName,
    dose: draft.dose,
    quantity: draft.quantity,
    scheduledFor: new Date(draft.scheduledFor),
    sentAt: null,
    response: null,
    respondedAt: null,
  }
}

function medRank(patient: PatientDoc, name: string | null): number {
  if (!name) return -1
  const index = patient.medications.findIndex((med) => med.name === name)
  return index === -1 ? 50 : index
}

function bySchedule(patient: PatientDoc) {
  return (a: TaskDoc, b: TaskDoc) => {
    const time = a.scheduledFor.getTime() - b.scheduledFor.getTime()
    if (time !== 0) return time
    return medRank(patient, a.medName) - medRank(patient, b.medName)
  }
}

function viewTask(task: TaskDoc, patient: PatientDoc, now: Date): TaskView {
  return presentTask(
    {
      id: task._id,
      kind: task.kind,
      medName: task.medName,
      scheduledFor: task.scheduledFor,
      sentAt: task.sentAt,
      response: task.response,
    },
    { patientName: patient.name, doctorName: patient.doctorName },
    now,
  )
}

function textBody(patient: PatientDoc, task: TaskDoc): string {
  return englishSms({
    caregiverName: patient.caregiverName,
    patientName: patient.name,
    doctorName: patient.doctorName,
    hospitalName: patient.hospitalName,
    kind: task.kind,
    medName: task.medName,
    href: `${baseUrl()}${patientPath(patient._id)}`,
    whenLabel: formatWhen(task.scheduledFor, 'en'),
  })
}

function recipients(patient: PatientDoc): string[] {
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

async function wipeDemo(db: Db) {
  await patientCol(db).deleteOne({ _id: DEMO.id })
  await taskCol(db).deleteMany({ patientId: DEMO.id })
  await messageCol(db).deleteMany({ patientId: DEMO.id })
  await orderCol(db).deleteOne({ _id: subscriptionOrderId(DEMO.hospitalName) })
}

async function seedIfNeeded(db: Db) {
  const existing = await patientCol(db).findOne({ _id: DEMO.id })
  if (existing?.seedComplete) return

  const lock = await metaCol(db).updateOne(
    { _id: 'seed-jordan' },
    { $setOnInsert: { at: new Date() } },
    { upsert: true },
  )
  if (lock.upsertedCount !== 1) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const row = await patientCol(db).findOne({ _id: DEMO.id })
      if (row?.seedComplete) return
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    const row = await patientCol(db).findOne({ _id: DEMO.id })
    if (row?.seedComplete) return
    throw new Error('Demo chart did not finish loading.')
  }

  try {
    await wipeDemo(db)
    const parsed = parseDischarge(SAMPLE_NOTE)
    if (parsed.error || parsed.medications.length < 1) throw new Error(parsed.error || 'Sample note did not parse.')
    const dischargeAt = demoDischargeAt()
    const summary = buildSummary({
      name: DEMO.name,
      city: DEMO.city,
      doctorName: DEMO.doctorName,
      caregiverName: DEMO.caregiverName,
      medications: parsed.medications,
      physicalTherapy: parsed.physicalTherapy,
      equipment: parsed.equipment,
    })
    const now = new Date()
    await patientCol(db).insertOne({
      _id: DEMO.id,
      name: DEMO.name,
      phone: DEMO.phone,
      caregiverName: DEMO.caregiverName,
      caregiverPhone: DEMO.caregiverPhone,
      doctorName: DEMO.doctorName,
      hospitalName: DEMO.hospitalName,
      city: DEMO.city,
      scenario: DEMO.scenario,
      dischargeNote: SAMPLE_NOTE,
      summary,
      medications: parsed.medications,
      physicalTherapy: parsed.physicalTherapy,
      equipment: parsed.equipment,
      status: 'active',
      dischargeAt,
      prefs: defaultPrefs(),
      seedComplete: false,
      createdAt: now,
      updatedAt: now,
    })
    const drafts = buildTasks({
      patientId: DEMO.id,
      patientName: DEMO.name,
      doctorName: DEMO.doctorName,
      medications: parsed.medications,
      dischargeAt,
    })
    if (drafts.length) await taskCol(db).insertMany(drafts.map(toTaskDoc))
    await orderCol(db).insertOne({
      _id: subscriptionOrderId(DEMO.hospitalName),
      patientId: slugify(DEMO.hospitalName),
      patientName: DEMO.hospitalName,
      hospitalName: DEMO.hospitalName,
      description: SUBSCRIPTION_DESCRIPTION,
      amountCents: ANNUAL_RATE_CENTS,
      status: 'pending',
      method: null,
      last4: null,
      createdAt: now,
      paidAt: null,
    })
    await patientCol(db).updateOne({ _id: DEMO.id }, { $set: { seedComplete: true } })
  } catch (error) {
    await wipeDemo(db)
    await metaCol(db).deleteOne({ _id: 'seed-jordan' })
    throw error
  }
}

export async function dispatchDue(db: Db, forceId?: string) {
  const now = new Date()
  const due = await taskCol(db).find({ sentAt: null, scheduledFor: { $lte: now } }).toArray()
  if (forceId && !due.some((task) => task._id === forceId)) {
    const forced = await taskCol(db).findOne({ _id: forceId, sentAt: null })
    if (forced) due.unshift(forced)
  }
  const patientsById = new Map<string, PatientDoc>()
  for (const task of due) {
    if (patientsById.has(task.patientId)) continue
    const patient = await patientCol(db).findOne({ _id: task.patientId })
    if (patient) patientsById.set(patient._id, patient)
  }
  due.sort((a, b) => {
    const time = a.scheduledFor.getTime() - b.scheduledFor.getTime()
    if (time !== 0) return time
    const patientA = patientsById.get(a.patientId)
    const patientB = patientsById.get(b.patientId)
    const rankA = patientA ? medRank(patientA, a.medName) : 0
    const rankB = patientB ? medRank(patientB, b.medName) : 0
    return rankB - rankA
  })
  for (let index = 0; index < due.length; index += 1) {
    const task = due[index]
    const patient = patientsById.get(task.patientId)
    if (!patient || patient.status !== 'active') continue
    const sentAt = new Date(now.getTime() + index)
    const href = `${baseUrl()}${patientPath(patient._id)}`
    const body = textBody(patient, task)
    const toPhones = recipients(patient)
    let inserted = false
    try {
      await messageCol(db).insertOne({
        _id: `msg:${task._id}`,
        patientId: patient._id,
        toPhones,
        body,
        href,
        taskId: task._id,
        sentAt,
      })
      inserted = true
    } catch (error) {
      if (!isDup(error)) throw error
    }
    await taskCol(db).updateOne({ _id: task._id, sentAt: null }, { $set: { sentAt } })
    if (inserted) {
      const sms = await deliverReminder(patient, body)
      await messageCol(db).updateOne({ _id: `msg:${task._id}` }, { $set: { sms } })
    }
  }
}

function startTimer() {
  if (process.env.VERCEL || globalForApp.__seventyTwoTimer) return
  globalForApp.__seventyTwoTimer = setInterval(() => {
    void ready().catch((error) => console.error(error))
  }, 5000)
  globalForApp.__seventyTwoTimer.unref?.()
}

export async function ready(): Promise<Db> {
  const db = await getDb()
  if (!globalForApp.__seventyTwoIndexed) {
    await taskCol(db).createIndex({ patientId: 1, scheduledFor: 1 })
    await messageCol(db).createIndex({ patientId: 1, sentAt: -1 })
    await orderCol(db).createIndex({ patientId: 1 })
    globalForApp.__seventyTwoIndexed = true
  }
  await seedIfNeeded(db)
  await ensureTelegramWebhookOnce(db)
  await dispatchDue(db)
  startTimer()
  return db
}

async function ensureTelegramWebhookOnce(db: Db) {
  if (!telegramConfigured()) return
  const lock = await metaCol(db).updateOne(
    { _id: 'telegram-webhook' },
    { $setOnInsert: { at: new Date() } },
    { upsert: true },
  )
  if (lock.upsertedCount !== 1) return
  await ensureTelegramWebhook(baseUrl())
}

export async function linkTelegramChat(patientId: string, chatId: string): Promise<void> {
  if (!isPatientId(patientId) || !chatId) return
  const db = await getDb()
  await patientCol(db).updateOne(
    { _id: patientId },
    { $addToSet: { telegramChatIds: chatId }, $set: { updatedAt: new Date() } },
  )
}

async function uniquePatientId(db: Db, name: string): Promise<string> {
  const base = slugify(name)
  let id = base
  let n = 2
  while (await patientCol(db).countDocuments({ _id: id })) {
    id = `${base}-${n}`
    n += 1
    if (n > 50) throw new Error('Could not make a patient id')
  }
  if (!isPatientId(id)) throw new Error('Could not make a patient id')
  return id
}

async function writeTasks(db: Db, patient: PatientDoc, mode: 'all' | 'future') {
  if (!patient.dischargeAt) return
  const drafts = buildTasks({
    patientId: patient._id,
    patientName: patient.name,
    doctorName: patient.doctorName,
    medications: patient.medications,
    dischargeAt: patient.dischargeAt,
  })
  if (mode === 'future') {
    await dispatchDue(db)
    await taskCol(db).deleteMany({ patientId: patient._id, sentAt: null })
    const sent = await taskCol(db).find({ patientId: patient._id, sentAt: { $ne: null } }).toArray()
    const sentIds = new Set(sent.map((task) => task._id))
    const now = Date.now()
    const future = drafts.filter((draft) => !sentIds.has(draft.id) && new Date(draft.scheduledFor).getTime() > now)
    if (future.length) await taskCol(db).insertMany(future.map(toTaskDoc))
    return
  }
  if (drafts.length) await taskCol(db).insertMany(drafts.map(toTaskDoc))
}

async function ensureOrder(db: Db, patient: PatientDoc) {
  // One flat annual subscription per hospital, shared by all of its patients.
  try {
    await orderCol(db).insertOne({
      _id: subscriptionOrderId(patient.hospitalName),
      patientId: slugify(patient.hospitalName),
      patientName: patient.hospitalName,
      hospitalName: patient.hospitalName,
      description: SUBSCRIPTION_DESCRIPTION,
      amountCents: ANNUAL_RATE_CENTS,
      status: 'pending',
      method: null,
      last4: null,
      createdAt: new Date(),
      paidAt: null,
    })
  } catch (error) {
    if (!isDup(error)) throw error
  }
}

export async function savePatient(input: SavePatientInput): Promise<{ error: string } | { ok: true; id: string }> {
  const validated = validatePlan(input)
  if (!validated.ok) return { error: validated.error }
  if (input.intent !== 'draft' && input.intent !== 'submit' && input.intent !== 'update') {
    return { error: 'Unknown save.' }
  }
  const db = await ready()
  const value = validated.value
  const now = new Date()
  let existing: PatientDoc | null = null
  let id = input.id?.trim() || ''
  if (id) {
    if (!isPatientId(id)) return { error: 'Unknown patient.' }
    existing = await patientCol(db).findOne({ _id: id })
    if (!existing) return { error: 'Unknown patient.' }
  } else {
    id = await uniquePatientId(db, value.name)
  }

  const alreadyActive = existing?.status === 'active'
  const status: 'draft' | 'active' = alreadyActive || input.intent === 'submit' ? 'active' : 'draft'
  const dischargeAt = existing?.dischargeAt ?? (status === 'active' ? now : null)

  await patientCol(db).updateOne(
    { _id: id },
    {
      $set: {
        name: value.name,
        phone: value.phone,
        caregiverName: value.caregiverName,
        caregiverPhone: value.caregiverPhone,
        doctorName: value.doctorName,
        hospitalName: value.hospitalName,
        city: value.city,
        scenario: existing?.scenario ?? null,
        dischargeNote: value.dischargeNote,
        summary: value.summary,
        medications: value.medications,
        physicalTherapy: value.physicalTherapy,
        equipment: value.equipment,
        status,
        dischargeAt,
        prefs: existing?.prefs ?? defaultPrefs(),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now, seedComplete: true },
    },
    { upsert: true },
  )

  const saved = await patientCol(db).findOne({ _id: id })
  if (!saved) return { error: 'Could not save the chart.' }
  if (saved.status === 'active') {
    if (alreadyActive) await writeTasks(db, saved, 'future')
    else await writeTasks(db, saved, 'all')
    await ensureOrder(db, saved)
    await dispatchDue(db)
  }
  return { ok: true, id }
}

export async function listPatients(): Promise<PatientListItem[]> {
  const db = await ready()
  const rows = await patientCol(db).find({}).sort({ updatedAt: -1 }).toArray()
  rows.sort((a, b) => (a._id === DEMO.id ? -1 : b._id === DEMO.id ? 1 : 0))
  return rows.map((patient) => ({
    id: patient._id,
    name: patient.name,
    city: patient.city,
    status: patient.status,
    scenario: patient.scenario,
    caregiverName: patient.caregiverName,
  }))
}

export async function getDoctorPatient(id: string): Promise<DoctorPatient | null> {
  if (!isPatientId(id)) return null
  const db = await ready()
  const patient = await patientCol(db).findOne({ _id: id })
  if (!patient) return null
  const now = new Date()
  const messages = await messageCol(db).find({ patientId: id }).toArray()
  const deliveryByTask = new Map(
    messages.map((message) => [message.taskId, deliveryNote(message.sms, message.toPhones)]),
  )
  const tasks = (await taskCol(db).find({ patientId: id }).toArray()).sort(bySchedule(patient)).map((task) => ({
    ...viewTask(task, patient, now),
    delivery: deliveryByTask.get(task._id) ?? null,
  }))
  const order = await orderCol(db).findOne({ _id: `${id}:portal` })
  return {
    id: patient._id,
    status: patient.status,
    scenario: patient.scenario,
    fields: fieldsOf(patient),
    prefs: patient.prefs,
    tasks,
    nextTask: tasks.find((task) => !task.sentAt) ?? null,
    orderStatus: order?.status ?? null,
  }
}

export async function getPatientPage(id: string): Promise<PatientPageData | null> {
  if (!isPatientId(id)) return null
  const db = await ready()
  const patient = await patientCol(db).findOne({ _id: id })
  if (!patient) return null
  const now = new Date()
  const tasks = (await taskCol(db).find({ patientId: id }).toArray()).sort(bySchedule(patient)).map((task) => viewTask(task, patient, now))
  const verify = tasks.find((task) => task.kind === 'verify') ?? null
  const meds = tasks.filter((task) => task.kind === 'med')
  return {
    id: patient._id,
    status: patient.status,
    name: patient.name,
    phone: patient.phone,
    caregiverName: patient.caregiverName,
    caregiverPhone: patient.caregiverPhone,
    doctorName: patient.doctorName,
    hospitalName: patient.hospitalName,
    city: patient.city,
    summary: patient.summary,
    medications: patient.medications,
    physicalTherapy: patient.physicalTherapy,
    equipment: patient.equipment,
    prefs: patient.prefs ?? defaultPrefs(),
    verify,
    openMeds: meds.filter((task) => task.sentAt && !task.response),
    upcoming: meds.filter((task) => !task.sentAt),
    answered: meds.filter((task) => task.response),
    facts: {
      name: patient.name,
      caregiverName: patient.caregiverName,
      doctorName: patient.doctorName,
      hospitalName: patient.hospitalName,
      city: patient.city,
      summary: patient.summary,
      physicalTherapy: patient.physicalTherapy,
      equipment: patient.equipment,
      medications: patient.medications,
      tasks,
    },
  }
}

export async function listThreads(focusId?: string): Promise<ThreadView[]> {
  const db = await ready()
  const people = await patientCol(db).find({ status: 'active' }).toArray()
  const threads: ThreadView[] = []
  for (const patient of people) {
    const tasks = (await taskCol(db).find({ patientId: patient._id }).toArray()).sort(bySchedule(patient))
    if (!tasks.length) continue
    const sentDocs = await messageCol(db).find({ patientId: patient._id }).toArray()
    const deliveryByTask = new Map(sentDocs.map((message) => [message.taskId, deliveryNote(message.sms, message.toPhones)]))
    const href = `${baseUrl()}${patientPath(patient._id)}`
    const now = new Date()
    const sent: MessageView[] = tasks
      .filter((task) => task.sentAt)
      .map((task) => {
        const view = viewTask(task, patient, now)
        return {
          id: task._id,
          patientId: patient._id,
          patientName: patient.name,
          body: textBody(patient, task),
          href,
          stampEn: view.stampEn,
          delivery: deliveryByTask.get(task._id) ?? null,
        }
      })
    const scheduled: ScheduledView[] = tasks
      .filter((task) => !task.sentAt)
      .map((task) => {
        const view = viewTask(task, patient, now)
        return { id: task._id, questionEn: view.questionEn, stampEn: view.stampEn, href }
      })
    threads.push({
      patientId: patient._id,
      patientName: patient.name,
      caregiverName: patient.caregiverName,
      caregiverPhone: patient.caregiverPhone,
      patientPhone: patient.phone,
      sent,
      scheduled,
    })
  }
  threads.sort((a, b) => (a.patientId === DEMO.id ? -1 : b.patientId === DEMO.id ? 1 : a.patientName.localeCompare(b.patientName)))
  if (focusId && isPatientId(focusId)) {
    threads.sort((a, b) => (a.patientId === focusId ? -1 : b.patientId === focusId ? 1 : 0))
  }
  return threads
}

export async function listOrders(): Promise<OrderView[]> {
  const db = await ready()
  const rows = await orderCol(db).find({}).sort({ createdAt: -1 }).toArray()
  return rows.map((order) => ({
    id: order._id,
    patientId: order.patientId,
    patientName: order.patientName,
    hospitalName: order.hospitalName,
    description: order.description,
    amountCents: order.amountCents,
    status: order.status,
    method: order.method,
    last4: order.last4,
    paidStamp: order.paidAt ? formatStamp(order.paidAt) : null,
  }))
}

export async function respondToTask(taskId: string, answer: string): Promise<void> {
  if ((answer !== 'yes' && answer !== 'no') || taskId.length < 1 || taskId.length > 240) return
  const db = await ready()
  const task = await taskCol(db).findOne({ _id: taskId })
  if (!task?.sentAt || task.response) return
  await taskCol(db).updateOne({ _id: taskId }, { $set: { response: answer, respondedAt: new Date() } })
}

export async function beginHospitalCheckout(orderId: string): Promise<{ url: string } | { error: string }> {
  if (!orderId || orderId.length > 120) return { error: 'Invoice not found.' }
  const db = await ready()
  const order = await orderCol(db).findOne({ _id: orderId })
  if (!order) return { error: 'Invoice not found.' }
  if (order.status === 'paid') return { error: 'This invoice is already paid.' }
  try {
    const url = await createCheckoutUrl({
      orderId: order._id,
      amountCents: order.amountCents,
      label: `${order.hospitalName} — ${order.description}`,
      baseUrl: baseUrl(),
    })
    return { url }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not start Stripe checkout.' }
  }
}

export async function confirmHospitalCheckout(sessionId: string): Promise<{ error: string } | { ok: true }> {
  if (!sessionId || sessionId.length > 200) return { error: 'Invalid checkout session.' }
  const db = await ready()
  let orderId: string | null
  try {
    orderId = await checkoutOrderId(sessionId)
  } catch {
    return { error: 'Could not verify the Stripe payment.' }
  }
  if (!orderId) return { error: 'Payment was not completed.' }
  await orderCol(db).updateOne(
    { _id: orderId, status: 'pending' },
    { $set: { status: 'paid', method: 'stripe', last4: null, paidAt: new Date() } },
  )
  return { ok: true }
}

export async function payHospitalOrder(input: {
  orderId: string
  method: string
  card: string
  expiry: string
  cvc: string
}): Promise<{ error: string } | { ok: true }> {
  if (!input.orderId || input.orderId.length > 120) return { error: 'Invoice not found.' }
  const db = await ready()
  const order = await orderCol(db).findOne({ _id: input.orderId })
  if (!order) return { error: 'Invoice not found.' }
  if (order.status === 'paid') return { ok: true }
  if (input.method === 'card') {
    const error = cardError(input.card, input.expiry, input.cvc)
    if (error) return { error }
    const last4 = input.card.replace(/\s+/g, '').slice(-4)
    await orderCol(db).updateOne(
      { _id: order._id, status: 'pending' },
      { $set: { status: 'paid', method: 'card', last4, paidAt: new Date() } },
    )
    return { ok: true }
  }
  if (input.method === 'link') {
    await orderCol(db).updateOne(
      { _id: order._id, status: 'pending' },
      { $set: { status: 'paid', method: 'link', last4: null, paidAt: new Date() } },
    )
    return { ok: true }
  }
  return { error: 'Choose card or Link.' }
}

export async function sendNextText(patientId: string): Promise<{ error: string } | { ok: true }> {
  if (!isPatientId(patientId)) return { error: 'Unknown patient.' }
  const db = await ready()
  const patient = await patientCol(db).findOne({ _id: patientId })
  if (!patient) return { error: 'Unknown patient.' }
  const pending = (await taskCol(db).find({ patientId, sentAt: null }).toArray()).sort(bySchedule(patient))
  const next = pending[0]
  if (!next) return { error: 'No upcoming texts.' }
  await dispatchDue(db, next._id)
  return { ok: true }
}

export async function savePrefs(patientId: string, prefs: unknown): Promise<{ error: string } | { ok: true }> {
  const clean = sanitizePrefs(prefs)
  if (!clean || !isPatientId(patientId)) return { error: 'Could not save those settings.' }
  const db = await ready()
  const updated = await patientCol(db).updateOne({ _id: patientId }, { $set: { prefs: clean, updatedAt: new Date() } })
  if (!updated.matchedCount) return { error: 'Unknown patient.' }
  return { ok: true }
}
