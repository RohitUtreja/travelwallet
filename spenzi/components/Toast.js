'use client'
import { useEffect, useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  function showToast(message, type = 'info') {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }

  return { toasts, showToast }
}

export default function Toast({ toasts }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div
      className="fixed left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="px-5 py-3 rounded-full text-xs font-semibold pointer-events-auto animate-slide-up mono"
          style={{
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            letterSpacing: '0.05em',
            ...(toast.type === 'error'
              ? { background: 'rgba(255,77,77,0.12)', border: '1px solid rgba(255,77,77,0.4)', color: '#ff4d4d' }
              : toast.type === 'success'
              ? { background: 'rgba(204,255,0,0.10)', border: '1px solid rgba(204,255,0,0.4)', color: '#ccff00' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#ebebeb' }
            ),
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
