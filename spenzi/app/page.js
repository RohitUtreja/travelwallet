'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Spinner } from '@/components/ui/Button'

export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => router.replace(session ? '/groups' : '/login'))
  }, [router])
  return (
    <div className="flex min-h-dvh items-center justify-center text-gold">
      <Spinner className="h-7 w-7" />
    </div>
  )
}
