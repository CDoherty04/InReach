import Link from 'next/link'
import { sendNextAction } from '@/app/actions'
import { Header } from '@/components/Header'
import { SubmitButton } from '@/components/SubmitButton'
import { DEMO, patientPath } from '@/lib/plan'
import { getDoctorPatient, listPatients } from '@/lib/store'

export const metadata = { title: 'Doctor' }

export default async function DoctorPage() {
  const patients = await listPatients()
  const demo = await getDoctorPatient(DEMO.id)
  const others = patients.filter((patient) => patient.id !== DEMO.id)

  return (
    <main className="wrap">
      <Header />
      <div className="stack">
        <h1>InReach</h1>
        <p>After discharge, caregivers get timed yes/no reminders and a simple home page for the first 72 hours.</p>

        <section className="card demo-guide">
          <p className="eyebrow">Try the demo</p>
          <h2>{DEMO.name}</h2>
          <p>{DEMO.scenario}</p>
          <div className="demo-actions">
            <Link className="btn primary" href={patientPath(DEMO.id)}>
              1. Caregiver page
            </Link>
            {demo?.nextTask ? (
              <form action={sendNextAction}>
                <input type="hidden" name="patientId" value={DEMO.id} />
                <SubmitButton>2. Send next reminder</SubmitButton>
              </form>
            ) : (
              <Link className="btn" href={`/doctor/patients/${DEMO.id}`}>
                2. Doctor chart
              </Link>
            )}
            <Link className="btn" href={`/sms?patient=${DEMO.id}`}>
              3. Message log
            </Link>
          </div>
          <p className="hint">Use the mic on the caregiver page to ask about medications. Reminders go to Telegram when the bot is configured.</p>
        </section>

        <p>
          <Link className="btn" href="/doctor/new">
            New discharge
          </Link>
        </p>

        {others.length ? (
          <details className="card">
            <summary>Other charts ({others.length})</summary>
            <ul className="plain">
              {others.map((patient) => (
                <li key={patient.id}>
                  <Link href={`/doctor/patients/${patient.id}`}>{patient.name}</Link>
                  {' · '}
                  {patient.status}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </main>
  )
}
