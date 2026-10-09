'use client'

import { useState } from 'react'
import { HOSPITAL_RATE_CENTS, formatMoney, volumeEstimate } from '@/lib/plan'

export function VolumeMath() {
  const [raw, setRaw] = useState('')
  const parsed = raw.trim() === '' ? null : volumeEstimate(Number(raw))
  return (
    <div className="card">
      <label htmlFor="volume">Discharges per year</label>
      <input
        id="volume"
        inputMode="numeric"
        value={raw}
        placeholder="Your figure"
        onChange={(event) => setRaw(event.target.value)}
      />
      <p className="hint">
        {formatMoney(HOSPITAL_RATE_CENTS)} flat rate per discharge. Texts, hosting, and parsing stay under $1 a patient and are not added to the invoice.
      </p>
      {parsed ? (
        <p>
          {parsed.discharges} × {formatMoney(HOSPITAL_RATE_CENTS)} = {formatMoney(parsed.invoiceCents)}. Variable cost under{' '}
          {formatMoney(parsed.variableCeilingDollars * 100)}.
        </p>
      ) : raw.trim() ? (
        <p className="error">Enter a whole number of discharges.</p>
      ) : null}
    </div>
  )
}
