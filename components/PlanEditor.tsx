'use client'

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { extractUploadAction, parseNoteAction, savePatientAction } from '@/app/actions'
import { DEMO, SAMPLE_NOTE, buildSummary, clockPreview, newId } from '@/lib/plan'
import type { Medication, ParseResult, PlanFields } from '@/lib/types'

function formatInitialPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length !== 10) return phone
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

export function PlanEditor({
  id,
  status,
  fields,
}: {
  id?: string
  status: 'new' | 'draft' | 'active'
  fields: PlanFields
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<PlanFields>({
    ...fields,
    phone: formatInitialPhone(fields.phone),
    caregiverPhone: formatInitialPhone(fields.caregiverPhone),
  })
  const [parsedNote, setParsedNote] = useState(fields.medications.length ? fields.dischargeNote : '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)
  const [manual, setManual] = useState(status !== 'new')
  const [ready, setReady] = useState(status !== 'new')
  const [hot, setHot] = useState(false)
  const uploading = useRef(false)
  const showForm = manual || ready

  function patch(partial: Partial<PlanFields>) {
    setSaved(false)
    setDraft((current) => ({ ...current, ...partial }))
  }

  function patchMed(medId: string, partial: Partial<Medication>) {
    setSaved(false)
    setDraft((current) => ({
      ...current,
      medications: current.medications.map((med) => (med.id === medId ? { ...med, ...partial } : med)),
    }))
  }

  function applyParsed(note: string, parsed: ParseResult, base: PlanFields): boolean {
    if (parsed.error && !parsed.medications.length && !parsed.physicalTherapy && !parsed.equipment.length) {
      setError(parsed.error)
      return false
    }
    setError(null)
    const medications = parsed.medications.length ? parsed.medications : base.medications
    const physicalTherapy = parsed.physicalTherapy || base.physicalTherapy
    const equipment = parsed.equipment.length ? parsed.equipment : base.equipment
    const next = {
      ...base,
      dischargeNote: note,
      name: parsed.name || base.name,
      phone: parsed.phone ? formatInitialPhone(parsed.phone) : base.phone,
      caregiverName: parsed.caregiverName || base.caregiverName,
      caregiverPhone: parsed.caregiverPhone ? formatInitialPhone(parsed.caregiverPhone) : base.caregiverPhone,
      doctorName: parsed.doctorName || base.doctorName,
      hospitalName: parsed.hospitalName || base.hospitalName,
      city: parsed.city || base.city,
      medications,
      physicalTherapy,
      equipment,
    }
    next.summary = buildSummary({
      name: next.name || 'Patient',
      city: next.city || 'home',
      doctorName: next.doctorName || 'the doctor',
      caregiverName: next.caregiverName || 'the caregiver',
      medications,
      physicalTherapy,
      equipment,
    })
    if (parsed.procedure && next.name) next.summary = `${next.name} — ${parsed.procedure}. ${next.summary}`
    setDraft(next)
    setParsedNote(note)
    setReady(true)
    return true
  }

  async function parseText(note: string, base: PlanFields) {
    setPending(true)
    setError(null)
    try {
      const result = await parseNoteAction(note)
      if ('error' in result) setError(result.error)
      else applyParsed(note, result.parsed, base)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read that note.')
    } finally {
      setPending(false)
    }
  }

  async function uploadFile(file: File) {
    if (uploading.current) return
    uploading.current = true
    setPending(true)
    setError(null)
    try {
      const body = new FormData()
      body.set('file', file)
      const result = await extractUploadAction(body)
      if ('error' in result) setError(result.error)
      else applyParsed(result.text, result.parsed, draft)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read that PDF.')
    } finally {
      uploading.current = false
      setPending(false)
    }
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void uploadFile(file)
  }

  function onDropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setHot(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void uploadFile(file)
  }

  async function submit(intent: 'draft' | 'submit' | 'update') {
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      const result = await savePatientAction({ ...draft, id, intent })
      if ('error' in result) setError(result.error)
      else if (result.href) router.push(result.href)
      else {
        setSaved(true)
        router.refresh()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault()
        void submit(status === 'active' ? 'update' : 'submit')
      }}
    >
      {showForm ? null : (
        <>
          <div
            className={hot ? 'dropzone hot' : 'dropzone'}
            onDragOver={(event) => {
              event.preventDefault()
              setHot(true)
            }}
            onDragLeave={() => setHot(false)}
            onDrop={onDropFile}
          >
            <label className="dropzone-hit">
              <input
                className="dropzone-input"
                type="file"
                accept="application/pdf,.pdf"
                aria-label="Upload discharge PDF"
                disabled={pending}
                onChange={(event) => void onUpload(event)}
              />
              <span className="dropzone-title">{pending ? 'Reading the PDF…' : 'Drop a discharge PDF'}</span>
              <span className="hint">
                {pending ? 'Pulling out medications, therapy, and equipment.' : 'Or click to choose a file.'}
              </span>
            </label>
            <div className="row">
            <button type="button" className="btn" onClick={() => setManual(true)}>
              Enter manually
            </button>
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() =>
                void parseText(SAMPLE_NOTE, {
                  ...draft,
                  name: draft.name || DEMO.name,
                  phone: draft.phone || formatInitialPhone(DEMO.phone),
                  caregiverName: draft.caregiverName || DEMO.caregiverName,
                  caregiverPhone: draft.caregiverPhone || formatInitialPhone(DEMO.caregiverPhone),
                  doctorName: draft.doctorName || DEMO.doctorName,
                  hospitalName: draft.hospitalName || DEMO.hospitalName,
                  city: draft.city || DEMO.city,
                })
              }
            >
              Load sample note
            </button>
            </div>
          </div>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
        </>
      )}
      {showForm ? (
      <>
      <div className="grid-2">
        <label>
          Patient name
          <input value={draft.name} onChange={(event) => patch({ name: event.target.value })} required />
        </label>
        <label>
          Patient mobile
          <input value={draft.phone} inputMode="tel" onChange={(event) => patch({ phone: event.target.value })} required />
        </label>
        <label>
          Caregiver name
          <input value={draft.caregiverName} onChange={(event) => patch({ caregiverName: event.target.value })} required />
        </label>
        <label>
          Caregiver mobile
          <input
            value={draft.caregiverPhone}
            inputMode="tel"
            onChange={(event) => patch({ caregiverPhone: event.target.value })}
            required
          />
        </label>
        <label>
          Doctor
          <input value={draft.doctorName} onChange={(event) => patch({ doctorName: event.target.value })} required />
        </label>
        <label>
          Hospital
          <input value={draft.hospitalName} onChange={(event) => patch({ hospitalName: event.target.value })} required />
        </label>
      </div>
      <label>
        City
        <input value={draft.city} onChange={(event) => patch({ city: event.target.value })} required />
      </label>
      <label>
        Discharge note
        <textarea rows={12} value={draft.dischargeNote} onChange={(event) => patch({ dischargeNote: event.target.value })} />
      </label>
      <div className="row">
        {status === 'new' && manual ? null : (
          <label className="btn">
            Upload PDF
            <input className="sr" type="file" accept="application/pdf,.pdf" onChange={onUpload} />
          </label>
        )}
        <button type="button" className="btn" disabled={pending} onClick={() => void parseText(draft.dischargeNote, draft)}>
          Parse note
        </button>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() =>
            void parseText(SAMPLE_NOTE, {
              ...draft,
              name: draft.name || DEMO.name,
              phone: draft.phone || formatInitialPhone(DEMO.phone),
              caregiverName: draft.caregiverName || DEMO.caregiverName,
              caregiverPhone: draft.caregiverPhone || formatInitialPhone(DEMO.caregiverPhone),
              doctorName: draft.doctorName || DEMO.doctorName,
              hospitalName: draft.hospitalName || DEMO.hospitalName,
              city: draft.city || DEMO.city,
            })
          }
        >
          Load sample note
        </button>
      </div>
      <details>
        <summary>Note format</summary>
        <pre className="hint">{`A discharge PDF like Michael Carter's chart, with Name, Primary caregiver, Caregiver phone, and Author.

Or a labeled note:
Medications
- Ibuprofen | 600 mg | qty 1 | every 8 hours | 7 days

Physical therapy
Passive range of motion twice a day.

Equipment
- Wheelchair, 18 inch`}</pre>
      </details>
      {draft.dischargeNote !== parsedNote && parsedNote ? <p className="hint">Note changed. Parse again to refresh the plan.</p> : null}
      <label>
        Summary the doctor reviews
        <textarea rows={4} value={draft.summary} onChange={(event) => patch({ summary: event.target.value })} />
      </label>
      <section className="stack">
        <h2>Medications</h2>
        <p className="hint">Texts only go out for the first 72 hours, even if the prescription is longer.</p>
        {draft.medications.map((med) => (
          <article key={med.id} className="card med">
            <div className="grid-2">
              <label>
                Name
                <input value={med.name} onChange={(event) => patchMed(med.id, { name: event.target.value })} />
              </label>
              <label>
                Dose
                <input value={med.dose} onChange={(event) => patchMed(med.id, { dose: event.target.value })} />
              </label>
            </div>
            <label className="slider-row">
              Quantity
              <input
                type="range"
                min={1}
                max={6}
                value={med.quantity}
                onChange={(event) => patchMed(med.id, { quantity: Number(event.target.value) })}
              />
              <output>{med.quantity}</output>
            </label>
            <label className="slider-row">
              Times a day
              <input
                type="range"
                min={1}
                max={6}
                value={med.frequencyPerDay}
                onChange={(event) => patchMed(med.id, { frequencyPerDay: Number(event.target.value) })}
              />
              <output>{med.frequencyPerDay}</output>
            </label>
            <label className="slider-row">
              Days
              <input
                type="range"
                min={1}
                max={30}
                value={med.durationDays}
                onChange={(event) => patchMed(med.id, { durationDays: Number(event.target.value) })}
              />
              <output>{med.durationDays}</output>
            </label>
            <p className="hint">Texts at {clockPreview(med.frequencyPerDay)}.</p>
            <button
              type="button"
              className="btn"
              onClick={() => patch({ medications: draft.medications.filter((item) => item.id !== med.id) })}
            >
              Remove {med.name || 'medication'}
            </button>
          </article>
        ))}
        <button
          type="button"
          className="btn"
          onClick={() =>
            patch({
              medications: [
                ...draft.medications,
                { id: newId(), name: '', dose: '', quantity: 1, frequencyPerDay: 3, durationDays: 7 },
              ],
            })
          }
        >
          Add medication
        </button>
      </section>
      <label>
        Physical therapy
        <textarea rows={3} value={draft.physicalTherapy} onChange={(event) => patch({ physicalTherapy: event.target.value })} />
      </label>
      <section className="stack">
        <h2>Equipment</h2>
        {draft.equipment.map((item, index) => (
          <div key={index} className="row">
            <label className="grow">
              Item {index + 1}
              <input
                value={item}
                onChange={(event) => {
                  const equipment = [...draft.equipment]
                  equipment[index] = event.target.value
                  patch({ equipment })
                }}
              />
            </label>
            <button
              type="button"
              className="btn"
              onClick={() => patch({ equipment: draft.equipment.filter((_, itemIndex) => itemIndex !== index) })}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => patch({ equipment: [...draft.equipment, ''] })}>
          Add equipment
        </button>
      </section>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="ok">Saved. Future texts use this plan. Texts already sent stay as they are.</p> : null}
      <div className="row">
        {status === 'active' ? (
          <button className="btn primary" type="submit" disabled={pending}>
            {pending ? 'Working…' : 'Save changes'}
          </button>
        ) : (
          <>
            <button className="btn" type="button" disabled={pending} onClick={() => void submit('draft')}>
              Save draft
            </button>
            <button className="btn primary" type="submit" disabled={pending}>
              {pending ? 'Working…' : 'Submit and text the caregiver'}
            </button>
          </>
        )}
      </div>
      </>
      ) : null}
    </form>
  )
}
