'use client'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Button } from 'react-aria-components'

const ToastContext = createContext({ show: () => {} })
export const useToast = () => useContext(ToastContext)

/**
 * show(message, { type: 'info'|'success'|'error', action: { label, onPress }, duration })
 * Rendered in an aria-live region so screen readers announce it.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const seq = useRef(0)

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const show = useCallback((message, { type = 'info', action, duration } = {}) => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-2), { id, message, type, action }])
    setTimeout(() => dismiss(id), duration ?? (action ? 6000 : 3500))
    return id
  }, [dismiss])

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss])
  const tone = { error: 'border-coral/50 text-coral', success: 'border-gold/50 text-gold-soft', info: 'border-line text-ivory' }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 z-[80] flex flex-col items-center gap-2 px-4"
        style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}
      >
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex max-w-sm animate-rise items-center gap-4 rounded-full border bg-raised/95 py-2.5 pl-5 pr-3 text-sm shadow-lift backdrop-blur ${tone[t.type]}`}>
            <span>{t.message}</span>
            {t.action && (
              <Button
                onPress={() => { t.action.onPress(); dismiss(t.id) }}
                className="rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-ink outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft"
              >
                {t.action.label}
              </Button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
