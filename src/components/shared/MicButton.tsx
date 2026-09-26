import { useEffect, useRef, useState } from 'react'

/**
 * Turns recorded audio into text. golem-ui never knows which service is behind it; it rejects with
 * an Error whose message is shown to the person.
 */
export type Transcriber = (audio: Blob) => Promise<string>

/** No microphone in this browser means no button at all, not a button that fails when tapped. */
export function canRecord(): boolean {
  return (
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

export interface MicButtonProps {
  transcribe: Transcriber
  /** The recognized text, trimmed and never empty. */
  onText: (text: string) => void
  /** aria-label and tooltip, so the host names the button in its own language. */
  label: string
  onError?: (message: string) => void
}

const PREFERRED = 'audio/webm;codecs=opus'

/**
 * Tap to record, tap again to stop, Escape to discard. The blob goes to `transcribe` and the text
 * comes back through `onText`; nothing is sent anywhere by this button.
 */
export function MicButton({ transcribe, onText, label, onError }: MicButtonProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'working'>('idle')
  const [seconds, setSeconds] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  // A cancel has to survive into `onstop`, which fires after the click that set it.
  const cancelled = useRef(false)

  useEffect(() => {
    if (state !== 'recording') return
    const tick = setInterval(() => setSeconds((n) => n + 1), 1000)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      cancelled.current = true
      recorder.current?.stop()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(tick)
      window.removeEventListener('keydown', onKey)
    }
  }, [state])

  const fail = (error: unknown, fallback: string) =>
    onError?.(error instanceof Error ? error.message : fallback)

  const start = async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error: unknown) {
      fail(error, 'The microphone could not be opened.')
      return
    }
    const supported = MediaRecorder.isTypeSupported?.(PREFERRED)
    const rec = new MediaRecorder(stream, supported ? { mimeType: PREFERRED } : undefined)
    const chunks: Blob[] = []
    rec.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }
    rec.onstop = () => {
      stream.getTracks().forEach((track) => track.stop())
      if (cancelled.current) {
        setState('idle')
        return
      }
      setState('working')
      transcribe(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))
        .then((text) => {
          if (text.trim()) onText(text.trim())
        })
        .catch((error: unknown) => fail(error, 'The audio could not be transcribed.'))
        .finally(() => setState('idle'))
    }
    recorder.current = rec
    cancelled.current = false
    rec.start()
    setSeconds(0)
    setState('recording')
  }

  const click = () => {
    if (state === 'working') return
    if (state === 'recording') {
      recorder.current?.stop()
      return
    }
    onError?.('')
    void start()
  }

  return (
    <button
      type="button"
      onClick={click}
      title={label}
      aria-label={label}
      aria-pressed={state === 'recording'}
      disabled={state === 'working'}
      data-golem-mic={state}
      className={`flex h-[34px] shrink-0 items-center justify-center gap-1 rounded-full border px-2 text-[15px] transition-colors disabled:opacity-60 ${
        state === 'recording'
          ? 'border-(--chat-danger) text-(--chat-danger)'
          : 'border-(--chat-line) bg-(--chat-panel2) text-(--chat-dim) hover:border-(--chat-accent) hover:text-(--chat-text)'
      }`}
    >
      {state === 'recording' ? (
        <>
          <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-current" />
          <span className="font-mono text-xs tabular-nums">{seconds}s</span>
        </>
      ) : state === 'working' ? (
        <span
          aria-hidden="true"
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        <span aria-hidden="true">🎤</span>
      )}
    </button>
  )
}
