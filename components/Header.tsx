import Link from 'next/link'
import { DEMO } from '@/lib/plan'

export function Header() {
  return (
    <header className="top">
      <Link href="/doctor" className="brand" aria-label="InReach">
        <img className="brand-logo" src="/inreach-logo.png" alt="InReach" />
      </Link>
      <nav>
        <Link href="/doctor">Doctor</Link>
        <Link href={`/p/${DEMO.id}`}>Caregiver</Link>
        <Link href={`/sms?patient=${DEMO.id}`}>Messages</Link>
      </nav>
    </header>
  )
}
