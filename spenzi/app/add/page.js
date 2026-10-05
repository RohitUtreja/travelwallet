'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { getLastWallet } from '@/lib/api'
import { guessCurrency } from '@/lib/currencies'
import { useSession } from '@/lib/useSession'
import { Spinner } from '@/components/ui/Button'

/** Quick-add: jump straight to the add screen of the last wallet (or the personal wallet). */
export default function QuickAdd() {
  const router = useRouter()
  const { user } = useSession()
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const supabase = createClient()
      let id = getLastWallet()
      if (id) {
        const { data } = await supabase.from('groups').select('id').eq('id', id).maybeSingle()
        if (!data) id = null
      }
      if (!id) {
        const { data, error } = await supabase.rpc('ensure_personal_wallet', { p_currency: guessCurrency() })
        if (error) return router.replace('/groups')
        id = data
      }
      router.replace(`/groups/${id}/add`)
    })()
  }, [user, router])
  return (
    <div className="flex min-h-dvh items-center justify-center text-gold"><Spinner className="h-7 w-7" /></div>
  )
}
