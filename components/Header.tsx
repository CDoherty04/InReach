import Link from 'next/link'

export function Header() {
  return (
    <header className="top">
      <Link href="/doctor" className="brand" aria-label="InReach">
        <img className="brand-logo" src="/inreach-logo.png" alt="InReach" />
      </Link>
      <nav>
        <Link href="/doctor">Doctor</Link>
        <Link href="/sms">Messages</Link>
      </nav>
    </header>
  )
}
