'use client'
import { useEffect, useState } from 'react'
import { PartyPopper } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { computeBalances, simplifyDebts } from '@/lib/utils'
import { ListSkeleton } from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import BalanceCard from './BalanceCard'

export default function BalancesPanel({ group, members, user, reloadKey }) {
  const { show } = useToast()
  const [txs, setTxs] = useState(null)

  useEffect(() => {
    let alive = true
    const supabase = createClient()
    // splits come embedded per expense, so the query is always scoped to this group
    Promise.all([
      supabase.from('expenses').select('id, paid_by, amount, expense_splits(user_id, amount)').eq('group_id', group.id),
      supabase.from('settlements').select('from_user, to_user, amount').eq('group_id', group.id),
    ]).then(([e, s]) => {
      if (!alive) return
      if (e.error || s.error) { show((e.error ?? s.error).message, { type: 'error' }); setTxs([]); return }
      const expenses = e.data ?? []
      const splits = expenses.flatMap((x) => (x.expense_splits ?? []).map((sp) => ({ ...sp, expense_id: x.id })))
      setTxs(simplifyDebts(computeBalances(expenses, splits, s.data ?? [], members)))
    })
    return () => { alive = false }
  }, [group.id, members, reloadKey, show])

  if (txs === null) return <div className="px-5 py-6"><ListSkeleton rows={3} className="h-28" /></div>
  if (txs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
        <PartyPopper aria-hidden size={36} strokeWidth={1.2} className="text-gold/70" />
        <p className="display text-2xl">All settled up</p>
        <p className="text-sm text-muted">No one owes anyone.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 px-5 py-6">
      <h2 className="eyebrow">Simplest way to settle</h2>
      {txs.map((tx, i) => <BalanceCard key={i} tx={tx} currency={group.currency} groupId={group.id} userId={user.id} />)}
    </div>
  )
}
