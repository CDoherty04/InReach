import { Header } from '@/components/Header'
import { PlanEditor } from '@/components/PlanEditor'
import { DEMO } from '@/lib/plan'
import type { PlanFields } from '@/lib/types'

export const metadata = { title: 'New discharge' }

const blank: PlanFields = {
  name: '',
  phone: '',
  caregiverName: '',
  caregiverPhone: '',
  doctorName: DEMO.doctorName,
  hospitalName: DEMO.hospitalName,
  city: DEMO.city,
  dischargeNote: '',
  summary: '',
  medications: [],
  physicalTherapy: '',
  equipment: [],
}

export default function NewDischargePage() {
  return (
    <main className="wrap">
      <Header />
      <div className="stack">
        <h1>New discharge</h1>
        <p>Upload a discharge PDF, review the sliders, then submit. That texts the caregiver and opens their patient page.</p>
        <PlanEditor status="new" fields={blank} />
      </div>
    </main>
  )
}
