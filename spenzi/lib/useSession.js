'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from './supabase'

/** Resolves the signed-in user; redirects to /login (remembering where you were) when required. */
export function useSession({ required = true } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState({ user: null, loading: true })

  useEffect(() => {
    const supabase = createClient()
    let alive = true
    const apply = (session) => {
      if (!alive) return
      if (!session && required) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
      setState({ user: session?.user ?? null, loading: !session && required })
    }
    supabase.auth.getSession().then(({ data: { session } }) => apply(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => apply(session))
    return () => { alive = false; subscription.unsubscribe() }
  }, [required, pathname, router])

  return state
}
