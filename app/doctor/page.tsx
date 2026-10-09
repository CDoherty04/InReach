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
        <h1>Doctor chart</h1>
        <p>Upload a discharge once. Review the parse, then submit. The caregiver text thread starts from that submit.</p>
        <p>
          <Link className="btn primary" href="/doctor/new">
            New discharge
          </Link>
        </p>
        <ul className="plain">
          {patients.map((patient) => (
            <li key={patient.id} className="card">
              <strong>
                <Link href={`/doctor/patients/${patient.id}`}>{patient.name}</Link>
              </strong>
              <p>
                {patient.status === 'active' ? 'Active' : 'Draft'} · {patient.city} · Caregiver {patient.caregiverName}
              </p>
              {patient.scenario ? <p className="hint">{patient.scenario}</p> : null}
              <p>
                <Link href={`/p/${patient.id}`}>Patient page</Link>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
