import Link from 'next/link'
import { Header } from '@/components/Header'
import { Poller } from '@/components/Poller'
import { patientPath } from '@/lib/plan'
import { listThreads } from '@/lib/store'

export const metadata = { title: 'Messages' }

function preview(body: string): string {
  const lines = body.split('\n').map((line) => line.trim()).filter(Boolean)
  const question = lines.find((line) => line.includes('?'))
  return question || lines[1] || lines[0] || body
}

export default async function SmsPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const query = await searchParams
  const focus = query.patient
  const threads = await listThreads(focus)
  const thread = (focus ? threads.find((row) => row.patientId === focus) : undefined) ?? threads[0]

  return (
    <main className="wrap">
      <Poller />
      <Header />
      <div className="stack">
        <h1>Messages</h1>
        <p className="hint">What caregivers receive after the doctor submits a discharge.</p>
        {threads.length > 1 ? (
          <p className="row">
            {threads.map((row) => (
              <Link key={row.patientId} href={`/sms?patient=${row.patientId}`}>
                {row.patientName}
              </Link>
            ))}
          </p>
        ) : null}
        {thread ? (
          <section className="stack">
            <p>
              <strong>
                {thread.caregiverName} · {thread.patientName}
              </strong>
            </p>
            <p>
              <Link href={patientPath(thread.patientId)}>Open caregiver page</Link>
            </p>
            {thread.sent.length ? (
              thread.sent.map((message) => (
                <article key={message.id} className="bubble">
                  <p className="hint">{message.stampEn}</p>
                  <p>{preview(message.body)}</p>
                  <p>
                    <Link href={message.href}>Answer on the patient page</Link>
                  </p>
                </article>
              ))
            ) : (
              <p className="hint">No messages sent yet. Submit a discharge and send the next reminder from the doctor chart.</p>
            )}
            {thread.scheduled.length ? (
              <p className="hint">{thread.scheduled.length} more reminders scheduled for the next 72 hours.</p>
            ) : null}
          </section>
        ) : (
          <p className="hint">
            <Link href="/doctor">Create a discharge on the doctor page</Link> to see messages here.
          </p>
        )}
      </div>
    </main>
  )
}
