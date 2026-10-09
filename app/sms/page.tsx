import { Header } from '@/components/Header'
import { Poller } from '@/components/Poller'
import { formatPhone } from '@/lib/plan'
import { listThreads } from '@/lib/store'

export const metadata = { title: 'Texts' }

export default async function SmsPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const query = await searchParams
  const threads = await listThreads(query.patient)
  return (
    <main className="wrap">
      <Poller />
      <Header />
      <div className="stack">
        <h1>Text thread</h1>
        <p className="hint">Same doses as the patient page. Each row is one scheduled text.</p>
        {threads.length ? (
          threads.map((thread) => (
            <section key={thread.patientId} className="stack" id={`thread-${thread.patientId}`}>
              <h2>
                {thread.caregiverName} and {thread.patientName}
              </h2>
              <p className="hint">
                {formatPhone(thread.caregiverPhone)} and {formatPhone(thread.patientPhone)}
              </p>
              <p>
                <a href={`/p/${thread.patientId}`}>Open {thread.patientName}’s page</a>
              </p>
              {thread.sent.map((message) => (
                <article key={message.id} className="bubble">
                  <p className="hint">{message.stampEn}</p>
                  <p>{message.body}</p>
                  <p>
                    <a href={message.href}>{message.href}</a>
                  </p>
                  {message.delivery ? <p className="warn">{message.delivery}</p> : null}
                </article>
              ))}
              {thread.scheduled.length ? (
                <div className="card">
                  <h3>Scheduled</h3>
                  <ul className="schedule">
                    {thread.scheduled.map((message) => (
                      <li key={message.id}>
                        <strong>{message.stampEn}</strong>
                        <div>{message.questionEn}</div>
                        <a href={message.href}>{message.href}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ))
        ) : (
          <p>No texts yet. Submit a discharge from the doctor chart.</p>
        )}
      </div>
    </main>
  )
}
