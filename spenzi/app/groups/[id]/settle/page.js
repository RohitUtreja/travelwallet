'use client'
import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { useSession } from '@/lib/useSession'
import PageHeader from '@/components/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button, Spinner } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { notifyExpensesChanged } from '@/components/ExpenseForm'

function Settle() {
  const router = useRouter()
  const { id: groupId } = useParams()
  const params = useSearchParams()
  const { user } = useSession()
  const { show } = useToast()
  const from = params.get('from')
  const to = params.get('to')
  const amount = Math.round(parseFloat(params.get('amount') ?? '0') * 100) / 100

  const [ctx, setCtx] = useState(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    Promise.all([
      supabase.from('groups').select('currency').eq('id', groupId).maybeSingle(),
      supabase.from('profiles').select('id, name, avatar_color').in('id', [from, to].filter(Boolean)),
    ]).then(([g, p]) => {
      if (!g.data || !(amount > 0) || !from || !to || from === to) return router.replace(`/groups/${groupId}`)
      setCtx({ currency: g.data.currency, people: Object.fromEntries((p.data ?? []).map((x) => [x.id, x])) })
    })
  }, [user, groupId, from, to, amount, router])

  async function confirm() {
    setPending(true)
    const { error } = await createClient().from('settlements').insert({ group_id: groupId, from_user: from, to_user: to, amount })
    if (error) { show(error.message, { type: 'error' }); setPending(false); return }
    notifyExpensesChanged()
    show('Settlement recorded', { type: 'success' })
    router.replace(`/groups/${groupId}`)
  }

  if (!ctx) return <div className="flex min-h-[60dvh] items-center justify-center text-gold"><Spinner className="h-7 w-7" /></div>
  const a = ctx.people[from]
  const b = ctx.people[to]
  const you = (id, name) => (id === user.id ? 'You' : name)

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-6 py-10">
      <div className="card flex w-full flex-col items-center gap-7 p-8">
        <p className="eyebrow">Record a payment</p>
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col items-center gap-2"><Avatar name={a?.name} color={a?.avatar_color} size={64} /><span className="text-sm">{you(from, a?.name)}</span></div>
          <div className="flex flex-col items-center gap-1">
            <span className="display num text-4xl font-semibold text-gold-soft">{formatCurrency(amount, ctx.currency)}</span>
            <ArrowRight aria-hidden className="text-gold" />
          </div>
          <div className="flex flex-col items-center gap-2"><Avatar name={b?.name} color={b?.avatar_color} size={64} /><span className="text-sm">{you(to, b?.name)}</span></div>
        </div>
        <p className="text-center text-sm leading-relaxed text-muted">
          Confirm that {you(from, a?.name)} {from === user.id ? 'have' : 'has'} paid {you(to, b?.name)}. Balances update for everyone.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Button size="lg" isPending={pending} onPress={confirm}>Confirm payment</Button>
        <Button size="lg" variant="ghost" onPress={() => router.back()}>Cancel</Button>
      </div>
    </div>
  )
}

export default function SettlePage() {
  return (
    <div className="page">
      <PageHeader back title="Settle up" />
      <Suspense fallback={null}><Settle /></Suspense>
    </div>
  )
}
