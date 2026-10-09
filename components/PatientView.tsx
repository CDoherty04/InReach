import { respondAction } from '@/app/actions'
import { L } from '@/components/L'
import { SubmitButton } from '@/components/SubmitButton'
import { clockPreview, durationLabel, formatPhone, timesPerDayLabel } from '@/lib/plan'
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
      <p className="hint">
        {task.stampEn}
        {task.overdue ? (
          <>
            {' · '}
            <L en="Overdue" es="Atrasado" />
          </>
        ) : null}
      </p>
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
      <p>
        <L en={`Caregiver: ${data.caregiverName}`} es={`Persona cuidadora: ${data.caregiverName}`} />
      </p>
      <p>
        <L en={`Patient: ${data.name}`} es={`Paciente: ${data.name}`} />
        {' · '}
        {data.city}
      </p>
      <p className="hint">
        <L
          en={`Texts go to ${formatPhone(data.caregiverPhone)} and ${formatPhone(data.phone)}. Times are Central.`}
          es={`Los textos van a ${formatPhone(data.caregiverPhone)} y ${formatPhone(data.phone)}. Los horarios son del centro.`}
        />
      </p>
      <p>
        <L
          en="This page covers the first 72 hours after discharge. Texts ask yes or no when a dose is due."
          es="Esta página cubre las primeras 72 horas después del alta. Los textos preguntan sí o no cuando toca una dosis."
        />
      </p>
      {data.status !== 'active' ? (
        <p className="warn">
          <L en="The doctor has not submitted this plan yet." es="El médico todavía no envió este plan." />
        </p>
      ) : null}
      <section className="card" aria-labelledby="doctor-heading">
        <h2 id="doctor-heading">
          <L en="Doctor check" es="Verificación del médico" />
        </h2>
        <p>
          <L
            en={`${data.doctorName} at ${data.hospitalName} submitted this plan.`}
            es={`${data.doctorName} en ${data.hospitalName} envió este plan.`}
          />
        </p>
        {data.verify?.sentAt ? <TaskCard task={data.verify} patientId={data.id} /> : null}
        {data.verify?.response === 'no' ? (
          <p className="warn">
            <L
              en={`This page was flagged. Call ${data.hospitalName} before following this plan.`}
              es={`Esta página está marcada. Llame a ${data.hospitalName} antes de seguir este plan.`}
            />
          </p>
        ) : null}
      </section>
      <section aria-labelledby="open-heading">
        <h2 id="open-heading">
          <L en="Needs an answer" es="Necesita respuesta" />
        </h2>
        {data.openMeds.length ? (
          data.openMeds.map((task) => <TaskCard key={task.id} task={task} patientId={data.id} med />)
        ) : (
          <p className="hint">
            <L en="No medication texts are waiting." es="No hay textos de medicamentos en espera." />
          </p>
        )}
      </section>
      {data.answered.length ? (
        <section aria-labelledby="answered-heading">
          <h2 id="answered-heading">
            <L en="Already answered" es="Ya respondidas" />
          </h2>
          <ul className="plain">
            {data.answered.map((task) => (
              <li key={task.id}>
                <L en={task.questionEn} es={task.questionEs} />
                {' · '}
                <L
                  en={task.response === 'yes' ? 'Yes' : 'No'}
                  es={task.response === 'yes' ? 'Sí' : 'No'}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading">
          <L en="Discharge summary" es="Resumen del alta" />
        </h2>
        <p lang="en">{data.summary}</p>
      </section>
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
              <div>
                <L
                  en={`${med.quantity} per dose · ${timesPerDayLabel(med.frequencyPerDay, 'en')} · ${durationLabel(med.durationDays, 'en')}`}
                  es={`${med.quantity} por toma · ${timesPerDayLabel(med.frequencyPerDay, 'es')} · ${durationLabel(med.durationDays, 'es')}`}
                />
              </div>
              <div className="hint">
                <L
                  en={`Texts at ${clockPreview(med.frequencyPerDay, 'en')}`}
                  es={`Textos a las ${clockPreview(med.frequencyPerDay, 'es')}`}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="pt-heading">
        <h2 id="pt-heading">
          <L en="Physical therapy" es="Terapia física" />
        </h2>
        <p lang="en">{data.physicalTherapy || 'None listed.'}</p>
      </section>
      <section aria-labelledby="eq-heading">
        <h2 id="eq-heading">
          <L en="Equipment" es="Equipo" />
        </h2>
        {data.equipment.length ? (
          <ul>
            {data.equipment.map((item) => (
              <li key={item} lang="en">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p lang="en">None listed.</p>
        )}
      </section>
    </div>
  )
}
