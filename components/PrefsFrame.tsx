'use client'

import { useEffect, useRef, useState } from 'react'
import { updatePrefsAction } from '@/app/actions'
import { Assistant } from '@/components/Assistant'
import { L } from '@/components/L'
import type { AssistantFacts, Prefs } from '@/lib/types'

function sheetClass(prefs: Prefs): string {
  return `sheet size-${prefs.textSize}${prefs.dark ? ' dark' : ''}${prefs.contrast ? ' contrast' : ''}`
}

export function PrefsFrame({
  initial,
  patientId,
  facts,
  children,
}: {
  initial: Prefs
  patientId: string
  facts: AssistantFacts
  children: React.ReactNode
}) {
  const [prefs, setPrefs] = useState(initial)
  const latest = useRef(initial)
  const chain = useRef(Promise.resolve())

  useEffect(() => {
    document.documentElement.lang = prefs.lang === 'es' ? 'es' : 'en'
    return () => {
      document.documentElement.lang = 'en'
    }
  }, [prefs.lang])

  function change(next: Prefs) {
    latest.current = next
    setPrefs(next)
    const snapshot = next
    chain.current = chain.current
      .catch(() => undefined)
      .then(async () => {
        if (latest.current !== snapshot) return
        await updatePrefsAction(patientId, snapshot)
      })
  }

  return (
    <div className={sheetClass(prefs)} data-lang={prefs.lang} lang={prefs.lang === 'es' ? 'es' : 'en'}>
      <a className="skip" href="#plan">
        <L en="Skip to plan" es="Saltar al plan" />
      </a>
      <div className="sheet-inner">
        <a className="brand" href="/doctor" aria-label="InReach">
          <img className="brand-logo" src="/inreach-logo.png" alt="InReach" />
        </a>
        <div className="tools" role="toolbar" aria-label={prefs.lang === 'es' ? 'Accesibilidad' : 'Accessibility'}>
          <button type="button" aria-pressed={prefs.lang === 'en'} onClick={() => change({ ...prefs, lang: 'en' })}>
            English
          </button>
          <button type="button" aria-pressed={prefs.lang === 'es'} onClick={() => change({ ...prefs, lang: 'es' })}>
            Español
          </button>
          <button type="button" aria-pressed={prefs.textSize === 'md'} onClick={() => change({ ...prefs, textSize: 'md' })}>
            <L en="Text" es="Texto" />
          </button>
          <button type="button" aria-pressed={prefs.textSize === 'lg'} onClick={() => change({ ...prefs, textSize: 'lg' })}>
            <L en="Large" es="Grande" />
          </button>
          <button type="button" aria-pressed={prefs.textSize === 'xl'} onClick={() => change({ ...prefs, textSize: 'xl' })}>
            <L en="Largest" es="Máximo" />
          </button>
          <button type="button" aria-pressed={prefs.contrast} onClick={() => change({ ...prefs, contrast: !prefs.contrast })}>
            <L en="Contrast" es="Contraste" />
          </button>
          <button type="button" aria-pressed={prefs.dark} onClick={() => change({ ...prefs, dark: !prefs.dark })}>
            <L en="Dark mode" es="Modo oscuro" />
          </button>
        </div>
        <main id="plan">{children}</main>
        <Assistant facts={facts} lang={prefs.lang} />
      </div>
    </div>
  )
}
