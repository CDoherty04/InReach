'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="wrap">
      <h1>72 Hours hit a problem</h1>
      <p>{error.message}</p>
      <button className="btn primary" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  )
}
