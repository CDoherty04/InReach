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
        <p>Drop a discharge PDF. The plan fills in for review, then submit texts the caregiver and opens their page.</p>
        <PlanEditor status="new" fields={blank} />
      </div>
    </main>
  )
}
