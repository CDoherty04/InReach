import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sendNextAction } from '@/app/actions'
import { Header } from '@/components/Header'
import { PlanEditor } from '@/components/PlanEditor'
import { SubmitButton } from '@/components/SubmitButton'
import { patientPath } from '@/lib/plan'
import { getDoctorPatient } from '@/lib/store'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await getDoctorPatient(id)
  return { title: patient ? patient.fields.name : 'Chart' }
}

export default async function DoctorPatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const patient = await getDoctorPatient(id)
  if (!patient) notFound()

  return (
    <main className="wrap">
      <Header />
      <div className="stack">
        <p className="eyebrow">{patient.status === 'active' ? 'Active chart' : 'Draft'}</p>
        <h1>{patient.fields.name}</h1>
        {patient.scenario ? <p>{patient.scenario}</p> : null}
        <p className="row">
          <Link className="btn primary" href={patientPath(patient.id)}>
            Caregiver page
          </Link>
          <Link className="btn" href={`/sms?patient=${patient.id}`}>
            Messages
          </Link>
          <Link href="/doctor">All charts</Link>
        </p>
        {query.error ? (
          <p className="error" role="alert">
            {query.error}
          </p>
        ) : null}
        {patient.status === 'active' ? (
          <section className="card">
            <h2>Reminders</h2>
            {patient.nextTask ? (
              <form action={sendNextAction} className="stack">
                <input type="hidden" name="patientId" value={patient.id} />
                <SubmitButton>Send next reminder now</SubmitButton>
                <p className="hint">{patient.nextTask.questionEn}</p>
              </form>
            ) : (
              <p className="hint">All reminders for this 72-hour window have been sent.</p>
            )}
          </section>
        ) : null}
        <PlanEditor id={patient.id} status={patient.status} fields={patient.fields} />
      </div>
    </main>
  )
}
