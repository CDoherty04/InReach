import Link from 'next/link'
import { Header } from '@/components/Header'
import { DEMO } from '@/lib/plan'
import { listPatients } from '@/lib/store'

export default async function HomePage() {
  const patients = await listPatients()
  const demo = patients.find((patient) => patient.id === DEMO.id)
  return (
    <main className="wrap">
      <Header />
      <div className="stack">
        <p className="eyebrow">After discharge</p>
        <h1>The first 72 hours, on the caregiver’s phone.</h1>
        <p>
          A doctor submits the discharge once. The caregiver and patient get a text thread with a link to that patient’s page, and a yes or no when a dose is due.
        </p>
        <p>The hospital pays a $35 flat rate. Families are not billed.</p>
        {demo ? (
          <p className="hint">
            {demo.scenario} Caregiver: {demo.caregiverName}.
          </p>
        ) : (
          <p className="error">Demo chart did not load.</p>
        )}
        <div className="choices">
          <Link href="/sms?patient=jordan-ellis">
            <strong>Text thread</strong>
            Messages for Jordan and Morgan. Each one links to Jordan’s page.
          </Link>
          <Link href="/p/jordan-ellis">
            <strong>Jordan’s page</strong>
            The page the text opens. Answer the dose questions here.
          </Link>
          <Link href="/doctor/patients/jordan-ellis">
            <strong>Doctor chart</strong>
            Review the parsed plan, sliders, and submit. About five minutes, then it runs.
          </Link>
          <Link href="/doctor/orders">
            <strong>Hospital invoice</strong>
            Mock card or Link payment for the $35 discharge fee.
          </Link>
        </div>
      </div>
    </main>
  )
}
