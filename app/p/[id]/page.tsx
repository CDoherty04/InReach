import { notFound } from 'next/navigation'
import { PatientView } from '@/components/PatientView'
import { Poller } from '@/components/Poller'
import { PrefsFrame } from '@/components/PrefsFrame'
import { getPatientPage } from '@/lib/store'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await getPatientPage(id)
  return { title: patient?.name ?? 'Patient' }
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getPatientPage(id)
  if (!data) notFound()
  return (
    <PrefsFrame initial={data.prefs} patientId={data.id} facts={data.facts}>
      <Poller />
      <PatientView data={data} />
    </PrefsFrame>
  )
}
