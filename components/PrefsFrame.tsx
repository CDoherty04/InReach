'use client'

import { useEffect, useRef, useState } from 'react'
import { updatePrefsAction } from '@/app/actions'
import { Assistant } from '@/components/Assistant'
import { L } from '@/components/L'
import type { AssistantFacts, Lang, Prefs } from '@/lib/types'

const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇲🇽', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
]

const TEXT_SIZES: { value: Prefs['textSize']; en: string; es: string }[] = [
  { value: 'sm', en: 'Small', es: 'Pequeño' },
  { value: 'md', en: 'Default', es: 'Normal' },
  { value: 'lg', en: 'Large', es: 'Grande' },
  { value: 'xl', en: 'Largest', es: 'Máximo' },
]

function sheetClass(prefs: Prefs): string {
  return `sheet size-${prefs.textSize}${prefs.contrast ? ' contrast' : ''}`
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
  const es = prefs.lang === 'es'
  const contentLang: 'en' | 'es' = es ? 'es' : 'en'

  useEffect(() => {
    document.documentElement.lang = prefs.lang
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
    <div className={sheetClass(prefs)} data-lang={contentLang} lang={contentLang}>
      <a className="skip" href="#plan">
        <L en="Skip to plan" es="Saltar al plan" />
      </a>
      <div className="sheet-inner">
        <header className="sheet-head">
          <a className="brand" href="/doctor" aria-label="InReach">
            <img className="brand-logo" src="/inreach-logo.png" alt="InReach" />
          </a>
          <div className="tools" role="toolbar" aria-label={es ? 'Accesibilidad' : 'Accessibility'}>
            <label className="tool-select">
              <span className="sr">
                <L en="Language" es="Idioma" />
              </span>
              <select
                value={prefs.lang}
                onChange={(event) => change({ ...prefs, lang: event.target.value as Lang })}
              >
                {LANGUAGES.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.flag} {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="tool-select">
              <span className="sr">
                <L en="Text size" es="Tamaño del texto" />
              </span>
              <select
                value={prefs.textSize}
                onChange={(event) => change({ ...prefs, textSize: event.target.value as Prefs['textSize'] })}
              >
                {TEXT_SIZES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {es ? option.es : option.en}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" aria-pressed={prefs.contrast} onClick={() => change({ ...prefs, contrast: !prefs.contrast })}>
              <L en="Contrast" es="Contraste" />
            </button>
          </div>
        </header>
        <Assistant facts={facts} lang={prefs.lang} />
        <main id="plan">{children}</main>
      </div>
    </div>
  )
}
