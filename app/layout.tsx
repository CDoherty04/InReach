import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: '72 Hours', template: '%s · 72 Hours' },
  description: 'Caregiver texts for the first 72 hours after discharge.',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
