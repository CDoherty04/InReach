'use client'

import { useState } from 'react'
import { answerQuestion } from '@/lib/plan'
import type { AssistantFacts } from '@/lib/types'
import { L } from '@/components/L'

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRec = {
  lang: string
  interimResults: boolean
  onresult: ((event: SpeechResult) => void) | null
  onerror: (() => void) | null
  start: () => void
}

export function Assistant({ facts, lang }: { facts: AssistantFacts; lang: 'en' | 'es' }) {
  const [question, setQuestion] = useState('')
  const [hint, setHint] = useState('')
  const answer = question.trim() ? answerQuestion(question, facts, lang) : ''

  function dictate() {
    const host = window as Window & {
      SpeechRecognition?: new () => SpeechRec
      webkitSpeechRecognition?: new () => SpeechRec
    }
    const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition
    if (!Ctor) {
      setHint(lang === 'es' ? 'Este navegador no tiene dictado. Puede escribir.' : 'This browser has no dictation. You can type.')
      return
    }
    const rec = new Ctor()
    rec.lang = lang === 'es' ? 'es-MX' : 'en-US'
    rec.interimResults = false
    rec.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? ''
      setQuestion(text)
      setHint('')
    }
    rec.onerror = () => {
      setHint(lang === 'es' ? 'No se pudo oír. Puede escribir.' : "Couldn't hear. You can type.")
    }
    rec.start()
  }

  return (
    <section className="card" aria-labelledby="assistant-heading">
      <h2 id="assistant-heading">
        <L en="Voice assistant" es="Asistente de voz" />
      </h2>
      <p className="hint">
        <L
          en="Dictation turns speech into text. Answers come only from this chart."
          es="El dictado convierte la voz en texto. Las respuestas salen solo de esta hoja."
        />
      </p>
      <div className="assistant-row">
        <label className="sr" htmlFor="ask">
          <L en="Question" es="Pregunta" />
        </label>
        <input
          id="ask"
          value={question}
          placeholder={lang === 'es' ? 'Pregunte por un medicamento, terapia o equipo' : 'Ask about a medicine, therapy, or equipment'}
          onChange={(event) => {
            setQuestion(event.target.value)
            setHint('')
          }}
        />
        <button type="button" className="btn" onClick={dictate}>
          <L en="Dictate" es="Dictar" />
        </button>
      </div>
      {hint ? <p className="hint">{hint}</p> : null}
      {answer ? (
        <p role="status" lang={lang === 'es' && answer === facts.summary ? 'en' : undefined}>
          {answer}
        </p>
      ) : null}
    </section>
  )
}
