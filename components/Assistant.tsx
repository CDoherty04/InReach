'use client'

import { useEffect, useRef, useState } from 'react'
import { answerQuestion } from '@/lib/plan'
import type { AssistantFacts, Lang } from '@/lib/types'

const SPEECH_LOCALE: Record<Lang, string> = {
  en: 'en-US',
  es: 'es-MX',
  fr: 'fr-FR',
  zh: 'zh-CN',
  vi: 'vi-VN',
  ar: 'ar-SA',
}

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRec = {
  lang: string
  interimResults: boolean
  onresult: ((event: SpeechResult) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
      />
    </svg>
  )
}

export function Assistant({ facts, lang }: { facts: AssistantFacts; lang: Lang }) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking'>('idle')
  const [caption, setCaption] = useState('')
  const recRef = useRef<SpeechRec | null>(null)
  const contentLang: 'en' | 'es' = lang === 'es' ? 'es' : 'en'
  const es = lang === 'es'

  useEffect(() => {
    return () => {
      recRef.current?.abort()
      window.speechSynthesis.cancel()
    }
  }, [])

  function speak(text: string) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = SPEECH_LOCALE[lang] ?? 'en-US'
    setStatus('speaking')
    utterance.onend = () => setStatus('idle')
    utterance.onerror = () => setStatus('idle')
    window.speechSynthesis.speak(utterance)
  }

  function stopListening() {
    recRef.current?.stop()
    recRef.current = null
    if (status === 'listening') setStatus('idle')
  }

  function toggleMic() {
    if (status === 'speaking') {
      window.speechSynthesis.cancel()
      setStatus('idle')
      return
    }
    if (status === 'listening') {
      stopListening()
      return
    }

    const host = window as Window & {
      SpeechRecognition?: new () => SpeechRec
      webkitSpeechRecognition?: new () => SpeechRec
    }
    const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition
    if (!Ctor) {
      const msg = es ? 'Este navegador no tiene micrófono.' : 'This browser does not support the microphone.'
      setCaption(msg)
      speak(msg)
      return
    }

    const rec = new Ctor()
    recRef.current = rec
    rec.lang = SPEECH_LOCALE[lang] ?? 'en-US'
    rec.interimResults = false
    setCaption(es ? 'Escuchando…' : 'Listening…')
    setStatus('listening')

    rec.onresult = (event) => {
      const question = event.results[0]?.[0]?.transcript?.trim() ?? ''
      if (!question) {
        const msg = es ? 'No escuché una pregunta.' : "I didn't catch a question."
        setCaption(msg)
        speak(msg)
        return
      }
      const answer = answerQuestion(question, facts, contentLang)
      setCaption(answer)
      speak(answer)
    }
    rec.onerror = () => {
      const msg = es ? 'No se pudo oír. Intente otra vez.' : "Couldn't hear you. Try again."
      setCaption(msg)
      setStatus('idle')
      recRef.current = null
    }
    rec.onend = () => {
      recRef.current = null
      setStatus((current) => (current === 'listening' ? 'idle' : current))
    }
    try {
      rec.start()
    } catch {
      setStatus('idle')
      recRef.current = null
    }
  }

  const label =
    status === 'listening'
      ? es
        ? 'Dejar de escuchar'
        : 'Stop listening'
      : status === 'speaking'
        ? es
          ? 'Detener respuesta hablada'
          : 'Stop spoken answer'
        : es
          ? 'Preguntar con voz'
          : 'Ask with voice'

  return (
    <>
      {caption ? (
        <p className="voice-caption" role="status" aria-live="polite">
          {caption}
        </p>
      ) : null}
      <button
        type="button"
        className={status === 'listening' ? 'voice-fab listening' : 'voice-fab'}
        aria-label={label}
        aria-pressed={status === 'listening'}
        onClick={toggleMic}
      >
        <MicIcon />
      </button>
    </>
  )
}
