'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target } from 'lucide-react'
import { CURRENCIES } from '@/lib/currencies'
import { createClient } from '@/lib/supabase'
import { Button } from '../ui/Button'
import { ConfirmSheet } from '../ui/Sheet'
import { Select } from '../ui/Select'
import { useToast } from '../ui/Toast'
import MembersSection from './MembersSection'
import InviteSection from './InviteSection'
import RecurringSection from './RecurringSection'
import BudgetSheet from './BudgetSheet'

export default function ManagePanel({ group, members, user, isAdmin, reload }) {
  const router = useRouter()
  const { show } = useToast()
  const shared = group.type !== 'personal'
  const [confirm, setConfirm] = useState(null) // 'leave' | 'delete'
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [budgets, setBudgets] = useState([])

  async function openBudgets() {
    const { data } = await createClient().from('budgets').select('category, monthly_limit').eq('group_id', group.id)
    setBudgets(data ?? [])
    setBudgetOpen(true)
  }

  async function changeCurrency(currency) {
    if (currency === group.currency) return
    const { error } = await createClient().from('groups').update({ currency }).eq('id', group.id)
    if (error) show(error.message, { type: 'error' }); else show(`Currency set to ${currency}`, { type: 'success' })
    reload()
  }

  async function leave() {
    const { error } = await createClient().from('group_members').delete().eq('group_id', group.id).eq('user_id', user.id)
    if (error) return show(error.message, { type: 'error' })
    router.replace('/groups')
  }
  async function destroy() {
    const { error } = await createClient().from('groups').delete().eq('id', group.id)
    if (error) return show(error.message, { type: 'error' })
    router.replace('/groups')
  }

  return (
    <div className="flex flex-col gap-8 px-5 py-6">
      {shared && <MembersSection group={group} members={members} user={user} isAdmin={isAdmin} reload={reload} />}
      {shared && isAdmin && <InviteSection group={group} />}

      {isAdmin && (
        <section className="flex flex-col gap-3">
          <h2 className="eyebrow">Budgets</h2>
          <Button variant="ghost" onPress={openBudgets}><Target aria-hidden size={16} /> Edit monthly budgets</Button>
        </section>
      )}

      {isAdmin && (
        <section className="flex flex-col gap-2">
          <Select label="Currency" items={CURRENCIES} selectedKey={group.currency} onSelectionChange={changeCurrency} />
          <p className="text-xs text-faint">Only changes how amounts are shown — existing amounts aren’t converted.</p>
        </section>
      )}

      <RecurringSection group={group} user={user} isAdmin={isAdmin} />

      {shared && (
        <section className="flex flex-col gap-3 border-t border-line pt-6">
          <Button variant="danger" onPress={() => setConfirm('leave')}>Leave wallet</Button>
          {isAdmin && <Button variant="danger" onPress={() => setConfirm('delete')}>Delete wallet</Button>}
        </section>
      )}

      <ConfirmSheet isOpen={confirm === 'leave'} onOpenChange={(o) => !o && setConfirm(null)} title="Leave this wallet?" message="You’ll lose access. If you’re the only admin, promote someone first." confirmLabel="Leave" danger onConfirm={leave} />
      <ConfirmSheet isOpen={confirm === 'delete'} onOpenChange={(o) => !o && setConfirm(null)} title={`Delete “${group.name}”?`} message="All expenses, budgets and settlements are permanently deleted for everyone. This can’t be undone." confirmLabel="Delete forever" danger onConfirm={destroy} />
      <BudgetSheet isOpen={budgetOpen} onOpenChange={setBudgetOpen} groupId={group.id} currency={group.currency} budgets={budgets} onSaved={reload} />
    </div>
  )
}
