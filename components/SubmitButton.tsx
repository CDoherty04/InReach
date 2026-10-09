'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({
  children,
  name,
  value,
  tone = 'primary',
}: {
  children: React.ReactNode
  name?: string
  value?: string
  tone?: 'primary' | 'ghost'
}) {
  const { pending } = useFormStatus()
  return (
    <button className={tone === 'primary' ? 'btn primary' : 'btn'} type="submit" name={name} value={value} disabled={pending}>
      {pending ? 'Working…' : children}
    </button>
  )
}
