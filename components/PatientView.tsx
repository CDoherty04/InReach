import { respondAction } from '@/app/actions'
import { L } from '@/components/L'
import { SubmitButton } from '@/components/SubmitButton'
import { timesPerDayLabel } from '@/lib/plan'
import type { PatientPageData, TaskView } from '@/lib/types'

function YesNo({ task, patientId, yesEn, yesEs, noEn, noEs }: { task: TaskView; patientId: string; yesEn: string; yesEs: string; noEn: string; noEs: string }) {
  return (
    <div className="yesno">
      <form action={respondAction}>
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="answer" value="yes" />
        <SubmitButton>
          <L en={yesEn} es={yesEs} />
        </SubmitButton>
      </form>
      <form action={respondAction}>
        <input type="hidden" name="taskId" value={task.id} />
        <input type="hidden" name="patientId" value={patientId} />
        <input type="hidden" name="answer" value="no" />
        <SubmitButton tone="ghost">
          <L en={noEn} es={noEs} />
        </SubmitButton>
      </form>
    </div>
  )
}

function TaskCard({ task, patientId, med = false }: { task: TaskView; patientId: string; med?: boolean }) {
  return (
    <article className={task.overdue ? 'task overdue' : 'task'}>
      <p className="hint">{task.stampEn}</p>
      <p className="question">
        <L en={task.questionEn} es={task.questionEs} />
      </p>
      {task.response ? (
        <p className={task.response === 'yes' ? 'ok' : 'warn'}>
          <L
            en={task.response === 'yes' ? 'Answered yes' : 'Answered no'}
            es={task.response === 'yes' ? 'Respondió que sí' : 'Respondió que no'}
          />
        </p>
      ) : med ? (
        <YesNo task={task} patientId={patientId} yesEn="Yes, taken" yesEs="Sí, la tomó" noEn="No, not taken" noEs="No, no la tomó" />
      ) : (
        <YesNo task={task} patientId={patientId} yesEn="Yes, that's the doctor" yesEs="Sí, es el médico" noEn="No, this is wrong" noEs="No, está mal" />
      )}
    </article>
  )
}

export function PatientView({ data }: { data: PatientPageData }) {
  return (
    <div className="stack">
      <h1>{data.name}</h1>
      <p className="hint">
        <L en={`${data.caregiverName} · ${data.city} · first 72 hours after discharge`} es={`${data.caregiverName} · ${data.city} · primeras 72 horas`} />
      </p>
      {data.status !== 'active' ? (
        <p className="warn">
          <L en="Waiting for the doctor to submit this plan." es="Esperando que el médico envíe este plan." />
        </p>
      ) : null}

      {data.openMeds.length ? (
        <section aria-labelledby="open-heading">
          <h2 id="open-heading">
            <L en="Right now" es="Ahora mismo" />
          </h2>
          {data.openMeds.map((task) => (
            <TaskCard key={task.id} task={task} patientId={data.id} med />
          ))}
        </section>
      ) : null}

      {data.verify?.sentAt && !data.verify.response ? (
        <section className="card" aria-labelledby="doctor-heading">
          <h2 id="doctor-heading">
            <L en="Confirm doctor" es="Confirmar médico" />
          </h2>
          <TaskCard task={data.verify} patientId={data.id} />
        </section>
      ) : null}

      <section aria-labelledby="meds-heading">
        <h2 id="meds-heading">
          <L en="Medications" es="Medicamentos" />
        </h2>
        <ul className="plain">
          {data.medications.map((med) => (
            <li key={med.id}>
              <strong lang="en">
                {med.name} {med.dose}
              </strong>
              <div className="hint">
                <L
                  en={timesPerDayLabel(med.frequencyPerDay, 'en')}
                  es={timesPerDayLabel(med.frequencyPerDay, 'es')}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">
          <L en="Discharge summary" es="Resumen del alta" />
        </h2>
        <p lang="en">{data.summary}</p>
      </section>
    </div>
  )
}
