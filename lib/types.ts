export type Medication = {
  id: string
  name: string
  dose: string
  quantity: number
  frequencyPerDay: number
  durationDays: number
}

export type Lang = 'en' | 'es' | 'fr' | 'zh' | 'vi' | 'ar'

export type Prefs = {
  lang: Lang
  textSize: 'sm' | 'md' | 'lg' | 'xl'
  contrast: boolean
  dark: boolean
}

export type PlanFields = {
  name: string
  phone: string
  caregiverName: string
  caregiverPhone: string
  doctorName: string
  hospitalName: string
  city: string
  dischargeNote: string
  summary: string
  medications: Medication[]
  physicalTherapy: string
  equipment: string[]
}

export type SavePatientInput = PlanFields & {
  id?: string
  intent: 'draft' | 'submit' | 'update'
}

export type ParseResult = {
  medications: Medication[]
  physicalTherapy: string
  equipment: string[]
  warnings: string[]
  error?: string
  name?: string
  phone?: string
  caregiverName?: string
  caregiverPhone?: string
  doctorName?: string
  hospitalName?: string
  city?: string
  procedure?: string
}

export type TaskDraft = {
  id: string
  patientId: string
  kind: 'verify' | 'med'
  medName: string | null
  dose: string | null
  quantity: number | null
  scheduledFor: string
}

export type TaskView = {
  id: string
  kind: 'verify' | 'med'
  medName: string | null
  scheduledFor: string
  sentAt: string | null
  response: 'yes' | 'no' | null
  questionEn: string
  questionEs: string
  stampEn: string
  overdue: boolean
  delivery: string | null
}

export type AssistantFacts = {
  name: string
  caregiverName: string
  doctorName: string
  hospitalName: string
  city: string
  summary: string
  physicalTherapy: string
  equipment: string[]
  medications: Medication[]
  tasks: TaskView[]
}

export type PatientPageData = {
  id: string
  status: 'draft' | 'active'
  name: string
  phone: string
  caregiverName: string
  caregiverPhone: string
  doctorName: string
  hospitalName: string
  city: string
  summary: string
  medications: Medication[]
  physicalTherapy: string
  equipment: string[]
  prefs: Prefs
  verify: TaskView | null
  openMeds: TaskView[]
  upcoming: TaskView[]
  answered: TaskView[]
  facts: AssistantFacts
}

export type DoctorTask = TaskView

export type DoctorPatient = {
  id: string
  status: 'draft' | 'active'
  scenario: string | null
  fields: PlanFields
  prefs: Prefs
  tasks: DoctorTask[]
  nextTask: DoctorTask | null
  orderStatus: 'pending' | 'paid' | null
}

export type PatientListItem = {
  id: string
  name: string
  city: string
  status: 'draft' | 'active'
  scenario: string | null
  caregiverName: string
}

export type MessageView = {
  id: string
  patientId: string
  patientName: string
  body: string
  href: string
  stampEn: string
  delivery: string | null
}

export type ScheduledView = {
  id: string
  questionEn: string
  stampEn: string
  href: string
}

export type ThreadView = {
  patientId: string
  patientName: string
  caregiverName: string
  caregiverPhone: string
  patientPhone: string
  sent: MessageView[]
  scheduled: ScheduledView[]
}

export type OrderView = {
  id: string
  patientId: string
  patientName: string
  hospitalName: string
  description: string
  amountCents: number
  status: 'pending' | 'paid'
  method: 'card' | 'link' | 'stripe' | null
  last4: string | null
  paidStamp: string | null
}
