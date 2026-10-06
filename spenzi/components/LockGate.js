'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { createPinStore } from '@/lib/pin'
import Keypad from './Keypad'

const RELOCK_AFTER_MS = 30_000

/** Shows a PIN screen on open and after the app has been in the background for 30s. */
export default function LockGate({ children }) {
  const store = useMemo(() => createPinStore(), [])
  const [locked, setLocked] = useState(false)
  const [ready, setReady] = useState(false)
  const [digits, setDigits] = useState('')
  const [msg, setMsg] = useState('')
  const hiddenAt = useRef(null)
  const busy = useRef(false)

  useEffect(() => {
    setLocked(store.isEnabled())
    setReady(true)
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now()
      else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER_MS && store.isEnabled()) setLocked(true)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [store])

  const submit = useCallback(async (pin) => {
    busy.current = true
    const res = await store.verify(pin)
    busy.current = false
    setDigits('')
    if (res.ok) { setLocked(false); setMsg(''); return }
    setMsg(res.waitMs ? `Too many attempts. Try again in ${Math.ceil(res.waitMs / 1000)}s` : 'Incorrect PIN')
  }, [store])

  const onKey = (k) => {
    if (busy.current) return
    if (k === 'back') return setDigits((d) => d.slice(0, -1))
    const len = store.length()
    const next = (digits + k).slice(0, len)
    setDigits(next)
    if (next.length === len) submit(next)
  }

  return (
    <>
      <div inert={locked ? '' : undefined} aria-hidden={locked || undefined}>{children}</div>
      {ready && locked && (
        <div role="dialog" aria-modal="true" aria-label="App locked" className="fill-screen fixed z-[100] flex flex-col items-center justify-center bg-ink px-8">
          <Lock aria-hidden className="mb-6 text-gold" size={28} strokeWidth={1.5} />
          <h1 className="display mb-1 text-3xl font-semibold">FamilyWallet</h1>
          <p className="mb-8 text-sm text-muted">Enter your PIN</p>
          <div role="img" className="mb-2 flex h-4 gap-3" aria-label={`${digits.length} of ${store.length()} digits entered`}>
            {Array.from({ length: store.length() }, (_, i) => (
              <span key={i} className={`h-3 w-3 rounded-full border border-gold/60 ${i < digits.length ? 'bg-gold' : ''}`} />
            ))}
          </div>
          <p role="alert" className="mb-6 h-5 text-sm text-coral">{msg}</p>
          <Keypad decimal={false} onKey={onKey} className="w-72" />
        </div>
      )}
    </>
  )
}
