import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="wrap">
      <h1>That page is not on a chart.</h1>
      <p>
        <Link href="/doctor">Back to InReach</Link>
      </p>
    </main>
  )
}
