import Link from 'next/link'
import { Header } from '@/components/Header'
import { listPatients } from '@/lib/store'

export const metadata = { title: 'Doctor' }

export default async function DoctorPage() {
  const patients = await listPatients()

  return (
    <main className="wrap">
      <Header />
      <div className="stack">
        <h1>InReach</h1>
        <p>After discharge, caregivers get timed yes/no reminders and a simple home page for the first 72 hours.</p>
        <p>
          <Link className="btn primary" href="/doctor/new">
            New discharge
          </Link>
        </p>
        {patients.length ? (
          <ul className="plain">
            {patients.map((patient) => (
              <li key={patient.id}>
                <Link href={`/doctor/patients/${patient.id}`}>{patient.name}</Link>
                {' · '}
                {patient.status}
                {patient.city ? ` · ${patient.city}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">No discharges yet. Create one to start caregiver reminders.</p>
        )}
      </div>
    </main>
  )
}
