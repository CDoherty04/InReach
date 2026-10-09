'use client'

import { useEffect, useRef, useState } from 'react'
import { voiceAnswerAction } from '@/app/actions'
import { patientCopy } from '@/lib/patient-copy'
import type { AssistantFacts, Lang } from '@/lib/types'

const SPEECH_LOCALE: Record<Lang, string> = {
  en: 'en-US',
  es: 'es-MX',
  fr: 'fr-FR',
  zh: 'zh-CN',
  vi: 'vi-VN',
  ar: 'ar-SA',
}

const PAUSE_MS = 1800

type SpeechResult = {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}
type SpeechRec = {
  lang: string
  continuous: boolean
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
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle')
  const [liveText, setLiveText] = useState('')
  const [answerText, setAnswerText] = useState('')
  const recRef = useRef<SpeechRec | null>(null)
  const finalRef = useRef('')
  const pauseRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const answeringRef = useRef(false)

  useEffect(() => {
    return () => {
      if (pauseRef.current) clearTimeout(pauseRef.current)
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

  function clearPauseTimer() {
    if (pauseRef.current) {
      clearTimeout(pauseRef.current)
      pauseRef.current = null
    }
  }

  function stopListening() {
    clearPauseTimer()
    recRef.current?.stop()
    recRef.current = null
    if (status === 'listening') setStatus('idle')
  }

  async function submitQuestion(question: string) {
    if (answeringRef.current) return
    const q = question.trim()
    if (!q) {
      const msg = patientCopy(lang, 'voiceNoQuestion')
      setLiveText('')
      setAnswerText(msg)
      speak(msg)
      return
    }
    answeringRef.current = true
    setStatus('thinking')
    setAnswerText('')
    try {
      const { answer } = await voiceAnswerAction(facts, q, lang)
      setLiveText('')
      setAnswerText(answer)
      speak(answer)
    } catch {
      const msg = patientCopy(lang, 'voiceHearError')
      setAnswerText(msg)
      setStatus('idle')
    } finally {
      answeringRef.current = false
    }
  }

  function scheduleSubmit() {
    clearPauseTimer()
    pauseRef.current = setTimeout(() => {
      stopListening()
      void submitQuestion(finalRef.current)
    }, PAUSE_MS)
  }

  function toggleMic() {
    if (status === 'speaking') {
      window.speechSynthesis.cancel()
      setStatus('idle')
      return
    }
    if (status === 'thinking') return
    if (status === 'listening') {
      clearPauseTimer()
      const pending = finalRef.current.trim()
      stopListening()
      if (pending) void submitQuestion(pending)
      return
    }

    const host = window as Window & {
      SpeechRecognition?: new () => SpeechRec
      webkitSpeechRecognition?: new () => SpeechRec
    }
    const Ctor = host.SpeechRecognition || host.webkitSpeechRecognition
    if (!Ctor) {
      const msg = patientCopy(lang, 'voiceNoMic')
      setAnswerText(msg)
      speak(msg)
      return
    }

    finalRef.current = ''
    setLiveText('')
    setAnswerText('')
    const rec = new Ctor()
    recRef.current = rec
    rec.lang = SPEECH_LOCALE[lang] ?? 'en-US'
    rec.continuous = true
    rec.interimResults = true
    setStatus('listening')

    rec.onresult = (event) => {
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const piece = event.results[index]
        const text = piece[0]?.transcript ?? ''
        if (piece.isFinal) finalRef.current += text
        else interim += text
      }
      const combined = `${finalRef.current}${interim}`.trim()
      setLiveText(combined)
      if (finalRef.current.trim()) scheduleSubmit()
    }
    rec.onerror = () => {
      const msg = patientCopy(lang, 'voiceHearError')
      setAnswerText(msg)
      setStatus('idle')
      recRef.current = null
      clearPauseTimer()
    }
    rec.onend = () => {
      recRef.current = null
      clearPauseTimer()
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
      ? patientCopy(lang, 'voiceStopListen')
      : status === 'speaking'
        ? patientCopy(lang, 'voiceStopSpeak')
        : patientCopy(lang, 'voiceAsk')

  const caption =
    status === 'thinking'
      ? patientCopy(lang, 'voiceThinking')
      : answerText || liveText || (status === 'listening' ? patientCopy(lang, 'voiceListening') : '')

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
        disabled={status === 'thinking'}
        onClick={toggleMic}
      >
        <MicIcon />
      </button>
    </>
  )
}
