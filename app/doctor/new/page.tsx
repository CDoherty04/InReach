import Link from 'next/link'
import { Header } from '@/components/Header'
import { PlanEditor } from '@/components/PlanEditor'
import type { PlanFields } from '@/lib/types'

export const metadata = { title: 'New discharge' }

const blank: PlanFields = {
  name: '',
  phone: '',
  caregiverName: '',
  caregiverPhone: '',
  doctorName: '',
  hospitalName: '',
  city: '',
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
        <p>
          <Link href="/doctor">← All charts</Link>
        </p>
        <p>Drop a discharge PDF, review the plan, then submit to start caregiver reminders.</p>
        <PlanEditor status="new" fields={blank} />
      </div>
    </main>
  )
}
