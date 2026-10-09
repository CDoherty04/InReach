'use client'

import { createContext, useContext } from 'react'
import type { Lang } from '@/lib/types'

const LangContext = createContext<Lang>('en')

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

export function usePatientLang(): Lang {
  return useContext(LangContext)
}
