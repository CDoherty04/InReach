'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translateCareAction } from '@/app/actions'
import { usePatientLang } from '@/components/LangContext'
import type { CareTranslation } from '@/lib/translate'
type Source = CareTranslation & { patientId: string }

const CareTranslationContext = createContext<{
  content: CareTranslation
  pending: boolean
} | null>(null)

export function CareTranslationProvider({
  source,
  children,
}: {
  source: Source
  children: React.ReactNode
}) {
  const lang = usePatientLang()
  const [content, setContent] = useState<CareTranslation>({
    summary: source.summary,
    physicalTherapy: source.physicalTherapy,
    equipment: source.equipment,
  })
  const [pending, setPending] = useState(lang !== 'en')

  const sourceKey = useMemo(
    () => `${source.summary}\0${source.physicalTherapy}\0${source.equipment.join('\t')}`,
    [source.summary, source.physicalTherapy, source.equipment],
  )

  useEffect(() => {
    let cancelled = false
    if (lang === 'en') {
      setContent({
        summary: source.summary,
        physicalTherapy: source.physicalTherapy,
        equipment: source.equipment,
      })
      setPending(false)
      return
    }
    setPending(true)
    void translateCareAction(source.patientId, lang).then((result) => {
      if (cancelled) return
      if ('content' in result) setContent(result.content)
      setPending(false)
    })
    return () => {
      cancelled = true
    }
  }, [lang, source.patientId, sourceKey, source.summary, source.physicalTherapy, source.equipment])

  const value = useMemo(() => ({ content, pending }), [content, pending])
  return <CareTranslationContext.Provider value={value}>{children}</CareTranslationContext.Provider>
}

export function useCareTranslation(): { content: CareTranslation; pending: boolean } {
  const ctx = useContext(CareTranslationContext)
  if (!ctx) {
    throw new Error('useCareTranslation must be used within CareTranslationProvider')
  }
  return ctx
}

export function useLocalizedFacts<T extends { summary: string; physicalTherapy: string; equipment: string[] }>(
  facts: T,
): T {
  const { content } = useCareTranslation()
  return useMemo(
    () => ({
      ...facts,
      summary: content.summary,
      physicalTherapy: content.physicalTherapy,
      equipment: content.equipment,
    }),
    [facts, content.summary, content.physicalTherapy, content.equipment],
  )
}
