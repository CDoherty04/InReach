'use client'

import { useEffect, useRef, useState } from 'react'
import { updatePrefsAction } from '@/app/actions'
import { Assistant } from '@/components/Assistant'
import { LangProvider } from '@/components/LangContext'
import { patientCopy } from '@/lib/patient-copy'
import type { AssistantFacts, Lang, Prefs } from '@/lib/types'

const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'es', flag: '🇲🇽', label: 'Español' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
  { code: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
]

const TEXT_SIZE_KEYS = [
  { value: 'sm' as const, key: 'sizeSm' as const },
  { value: 'md' as const, key: 'sizeMd' as const },
  { value: 'lg' as const, key: 'sizeLg' as const },
  { value: 'xl' as const, key: 'sizeXl' as const },
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

  useEffect(() => {
    document.documentElement.lang = prefs.lang
    document.documentElement.dir = prefs.lang === 'ar' ? 'rtl' : 'ltr'
    return () => {
      document.documentElement.lang = 'en'
      document.documentElement.dir = 'ltr'
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
    <LangProvider lang={prefs.lang}>
      <div
        className={sheetClass(prefs)}
        lang={prefs.lang}
        dir={prefs.lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <a className="skip" href="#plan">
          {patientCopy(prefs.lang, 'skipToPlan')}
        </a>
        <div className="sheet-inner">
          <header className="sheet-head">
            <a className="brand" href="/doctor" aria-label="InReach">
              <img className="brand-logo" src="/inreach-logo.png" alt="InReach" />
            </a>
            <div className="sheet-tools" role="toolbar" aria-label={patientCopy(prefs.lang, 'accessibility')}>
              <label className="tool-select">
                <span className="sr">{patientCopy(prefs.lang, 'language')}</span>
                <select
                  className="tool-control"
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
                <span className="sr">{patientCopy(prefs.lang, 'textSize')}</span>
                <select
                  className="tool-control"
                  value={prefs.textSize}
                  onChange={(event) => change({ ...prefs, textSize: event.target.value as Prefs['textSize'] })}
                >
                  {TEXT_SIZE_KEYS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {patientCopy(prefs.lang, option.key)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="tool-control"
                aria-pressed={prefs.contrast}
                onClick={() => change({ ...prefs, contrast: !prefs.contrast })}
              >
                {patientCopy(prefs.lang, 'contrast')}
              </button>
            </div>
          </header>
          <main id="plan">{children}</main>
        </div>
        <Assistant facts={facts} lang={prefs.lang} />
      </div>
    </LangProvider>
  )
}
