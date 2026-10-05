'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './supabase'
import { setLastWallet } from './api'
import { useSession } from './useSession'

/**
 * Loads a wallet (group), its members and the caller's role.
 * Also materialises any due recurring expenses once per visit.
 */
export function useWallet(id, { applyRecurring = true } = {}) {
  const router = useRouter()
  const { user, loading: authLoading } = useSession()
  const [state, setState] = useState({ group: null, members: [], loading: true, error: null })

  const reload = useCallback(async () => {
    if (!user) return
    const supabase = createClient()
    const [{ data: group, error: gErr }, { data: members, error: mErr }] = await Promise.all([
      supabase.from('groups').select('*').eq('id', id).maybeSingle(),
      supabase.from('group_members').select('user_id, role, profiles(id, name, avatar_color)').eq('group_id', id),
    ])
    if (gErr || mErr) { setState((s) => ({ ...s, loading: false, error: (gErr ?? mErr).message })); return }
    if (!group) { router.replace('/groups'); return }
    setState({ group, members: members ?? [], loading: false, error: null })
    setLastWallet(id)
  }, [id, user, router])

  useEffect(() => {
    if (!user) return
    if (!applyRecurring) { reload(); return }
    // generate due recurring expenses first so the first render already includes them
    createClient().rpc('apply_recurring', { p_group: id }).then(() => reload(), () => reload())
  }, [id, user, reload, applyRecurring])

  const me = state.members.find((m) => m.user_id === user?.id)
  const role = me?.role ?? 'viewer'
  return {
    ...state,
    user,
    loading: authLoading || state.loading,
    role,
    isAdmin: role === 'admin',
    canWrite: role === 'admin' || role === 'member',
    reload,
  }
}
