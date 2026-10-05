'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useWallet } from '@/lib/useWallet'
import ExpenseForm from '@/components/ExpenseForm'
import { Spinner } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

export default function EditExpensePage() {
  const { id, eid } = useParams()
  const router = useRouter()
  const { show } = useToast()
  const { group, members, user, loading, isAdmin, canWrite } = useWallet(id, { applyRecurring: false })
  const [expense, setExpense] = useState(null)

  useEffect(() => {
    if (!user) return
    createClient().from('expenses').select('*, expense_splits(user_id)').eq('id', eid).eq('group_id', id).maybeSingle()
      .then(({ data }) => {
        if (!data) { show('Expense not found', { type: 'error' }); router.replace(`/groups/${id}`); return }
        setExpense({ ...data, splitUsers: (data.expense_splits ?? []).map((s) => s.user_id) })
      })
  }, [user, id, eid, router, show])

  const allowed = expense && (isAdmin || (canWrite && expense.paid_by === user?.id))
  useEffect(() => {
    if (expense && !loading && !allowed) {
      show('Only the person who added this (or an admin) can edit it', { type: 'error' })
      router.replace(`/groups/${id}`)
    }
  }, [expense, loading, allowed, id, router, show])

  if (loading || !group || !expense || !allowed) {
    return <div className="flex min-h-dvh items-center justify-center text-gold"><Spinner className="h-7 w-7" /></div>
  }
  return <ExpenseForm group={group} members={members} user={user} expense={expense} />
}
