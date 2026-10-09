'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function Poller({ ms = 8000 }: { ms?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), ms)
    return () => clearInterval(id)
  }, [router, ms])
  return null
}
