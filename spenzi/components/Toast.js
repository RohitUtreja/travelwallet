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
    <div className="fixed bottom-24 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            px-5 py-3 rounded-full text-sm font-semibold shadow-lg pointer-events-auto
            animate-slide-up
            ${toast.type === 'error'
              ? 'bg-[#FF6B6B]/20 border border-[#FF6B6B]/40 text-[#FF6B6B]'
              : toast.type === 'success'
              ? 'bg-[#00D4AA]/20 border border-[#00D4AA]/40 text-[#00D4AA]'
              : 'bg-[#1a2234] border border-[#1e2a40] text-[#F1F5F9]'
            }
          `}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
