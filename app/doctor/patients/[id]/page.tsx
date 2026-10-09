import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sendNextAction } from '@/app/actions'
import { Header } from '@/components/Header'
import { PlanEditor } from '@/components/PlanEditor'
import { SubmitButton } from '@/components/SubmitButton'
import { patientPath } from '@/lib/plan'
import { TelegramConnect } from '@/components/TelegramConnect'
import { telegramBotUsername, telegramConfigured, telegramConnectUrl } from '@/lib/telegram'
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
  const telegramUrl =
    telegramConfigured() && patient.status === 'active'
      ? telegramConnectUrl(patient.id, await telegramBotUsername())
      : null
  return (
    <main className="wrap">
      <Header />
      <div className="stack">
        <p className="eyebrow">{patient.status === 'active' ? 'Active' : 'Draft'}</p>
        <h1>{patient.fields.name}</h1>
        {patient.scenario ? <p>{patient.scenario}</p> : null}
        <p className="row">
          <Link href={patientPath(patient.id)}>Patient page</Link>
          <Link href={`/sms?patient=${patient.id}`}>Text thread</Link>
          <Link href="/doctor/orders">Invoice{patient.orderStatus ? ` · ${patient.orderStatus}` : ''}</Link>
        </p>
        {query.error ? (
          <p className="error" role="alert">
            {query.error}
          </p>
        ) : null}
        {telegramUrl ? <TelegramConnect connectUrl={telegramUrl} linked={patient.telegramLinked} /> : null}
        {patient.status === 'active' ? (
          <section className="card">
            <h2>Texts</h2>
            {patient.nextTask ? (
              <form action={sendNextAction}>
                <input type="hidden" name="patientId" value={patient.id} />
                <SubmitButton>Send next text now</SubmitButton>
                <p className="hint">{patient.nextTask.questionEn}</p>
              </form>
            ) : (
              <p className="hint">All texts for this 72-hour window have been sent.</p>
            )}
            <ul className="schedule">
              {patient.tasks.map((task) => (
                <li key={task.id}>
                  <strong>{task.stampEn}</strong> {task.questionEn}{' '}
                  <span className="hint">
                    {task.response ? task.response : task.sentAt ? (task.delivery ? 'not delivered' : 'sent') : 'scheduled'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <PlanEditor id={patient.id} status={patient.status} fields={patient.fields} />
      </div>
    </main>
  )
}
