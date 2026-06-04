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
    <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            w-full max-w-sm px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto
            animate-slide-down
            ${toast.type === 'error'
              ? 'bg-danger/20 border border-danger/40 text-danger'
              : toast.type === 'success'
              ? 'bg-accent/20 border border-accent/40 text-accent'
              : 'bg-surface2 border border-border text-textprimary'
            }
          `}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
