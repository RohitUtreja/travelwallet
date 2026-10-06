'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RouterProvider } from 'react-aria-components'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import LockGate from '@/components/LockGate'
import DebugViewport from '@/components/DebugViewport'
import ViewportSync from '@/components/ViewportSync'
import { flushOfflineQueue } from '@/lib/api'

function OfflineSync() {
  const { show } = useToast()
  useEffect(() => {
    let running = false
    const run = async () => {
      if (running) return
      running = true
      try {
        const { done, failed } = await flushOfflineQueue()
        if (done) show(`Synced ${done} offline expense${done > 1 ? 's' : ''}`, { type: 'success' })
        if (failed.length) show(`${failed.length} offline expense${failed.length > 1 ? 's' : ''} couldn't be saved`, { type: 'error' })
      } finally { running = false }
    }
    run()
    window.addEventListener('online', run)
    return () => window.removeEventListener('online', run)
  }, [show])
  return null
}

export default function Providers({ children }) {
  const router = useRouter()
  return (
    <RouterProvider navigate={router.push} useHref={(href) => href}>
      <ToastProvider>
        <LockGate>
          <OfflineSync />
          <ViewportSync />
          <DebugViewport />
          {children}
        </LockGate>
      </ToastProvider>
    </RouterProvider>
  )
}
