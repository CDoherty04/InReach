'use client'

import { respondAction } from '@/app/actions'
import { usePatientLang } from '@/components/LangContext'
import { SubmitButton } from '@/components/SubmitButton'
import { GRANTS } from '@/lib/plan'
import { patientCopy, patientSubtitle, taskQuestion, taskStamp, timesPerDay } from '@/lib/patient-copy'
import type { PatientPageData, TaskView } from '@/lib/types'

function TaskRespond({
  task,
  patientId,
  yesLabel,
  noLabel,
}: {
  task: TaskView
  patientId: string
  yesLabel: string
  noLabel?: string
}) {
  return (
    <div className="yesno">
      <form action={respondAction}>
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="answer" value="yes" />
        <SubmitButton>{yesLabel}</SubmitButton>
      </form>
      {noLabel ? (
        <form action={respondAction}>
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="answer" value="no" />
          <SubmitButton tone="ghost">{noLabel}</SubmitButton>
        </form>
      ) : null}
    </div>
  )
}

function TaskCard({
  task,
  patientId,
  patientName,
  doctorName,
  med = false,
}: {
  task: TaskView
  patientId: string
  patientName: string
  doctorName: string
  med?: boolean
}) {
  const lang = usePatientLang()
  const names = { patientName, doctorName }
  return (
    <article className={task.overdue ? 'task overdue' : 'task'}>
      <p className="hint">{taskStamp(lang, task.scheduledFor)}</p>
      <p className="question">{taskQuestion(lang, task, names)}</p>
      {task.response ? (
        <p className={task.response === 'yes' ? 'ok' : 'warn'}>
          {task.response === 'yes' ? patientCopy(lang, 'answeredYes') : patientCopy(lang, 'answeredNo')}
        </p>
      ) : med ? (
        <TaskRespond task={task} patientId={patientId} yesLabel={patientCopy(lang, 'yesTaken')} />
      ) : (
        <TaskRespond
          task={task}
          patientId={patientId}
          yesLabel={patientCopy(lang, 'yesDoctor')}
          noLabel={patientCopy(lang, 'noDoctor')}
        />
      )}
    </article>
  )
}

export function PatientView({ data }: { data: PatientPageData }) {
  const lang = usePatientLang()

  return (
    <div className="stack">
      <h1>{data.name}</h1>
      <p className="hint">{patientSubtitle(lang, data.caregiverName, data.city)}</p>
      {data.status !== 'active' ? (
        <p className="warn">{patientCopy(lang, 'waitingSubmit')}</p>
      ) : null}

      {data.openMeds.length ? (
        <section aria-labelledby="open-heading">
          <h2 id="open-heading">{patientCopy(lang, 'rightNow')}</h2>
          {data.openMeds.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              patientId={data.id}
              patientName={data.name}
              doctorName={data.doctorName}
              med
            />
          ))}
        </section>
      ) : null}

      {data.verify?.sentAt && !data.verify.response ? (
        <section className="card" aria-labelledby="doctor-heading">
          <h2 id="doctor-heading">{patientCopy(lang, 'confirmDoctor')}</h2>
          <TaskCard task={data.verify} patientId={data.id} patientName={data.name} doctorName={data.doctorName} />
        </section>
      ) : null}

      <section aria-labelledby="meds-heading">
        <h2 id="meds-heading">{patientCopy(lang, 'medications')}</h2>
        <ul className="plain">
          {data.medications.map((med) => (
            <li key={med.id}>
              <strong>
                {med.name} {med.dose}
              </strong>
              <div className="hint">{timesPerDay(lang, med.frequencyPerDay)}</div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">{patientCopy(lang, 'dischargeSummary')}</h2>
        <p>{data.summary}</p>
      </section>

      <section className="card grants" aria-labelledby="grants-heading">
        <h2 id="grants-heading">{patientCopy(lang, 'grantsHeading')}</h2>
        <ul>
          {GRANTS.map((grant) => (
            <li key={grant.href}>
              <a href={grant.href} target="_blank" rel="noreferrer">
                {grant.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
