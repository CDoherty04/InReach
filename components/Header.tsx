import Link from 'next/link'

export function Header() {
  return (
    <header className="top">
      <Link href="/" className="brand">
        72 Hours
      </Link>
      <nav>
        <Link href="/doctor">Doctor</Link>
        <Link href="/sms">Texts</Link>
        <Link href="/doctor/orders">Invoice</Link>
      </nav>
    </header>
  )
}
