'use client'
import { useEffect, useState } from 'react'
import { Form } from 'react-aria-components'
import { createClient } from '@/lib/supabase'
import { PICKER_CATEGORIES } from '@/lib/categories'
import { TOTAL_KEY } from '@/lib/budgets'
import { parseAmount } from '@/lib/utils'
import { Button } from '../ui/Button'
import { Sheet } from '../ui/Sheet'
import { TextField } from '../ui/TextField'
import { useToast } from '../ui/Toast'

/** Admins set monthly limits. Empty/0 = no budget (row removed). */
export default function BudgetSheet({ isOpen, onOpenChange, groupId, currency, budgets, onSaved }) {
  const { show } = useToast()
  const [vals, setVals] = useState({})
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (isOpen) setVals(Object.fromEntries((budgets ?? []).map((b) => [b.category, String(Number(b.monthly_limit))])))
  }, [isOpen, budgets])

  async function save() {
    setPending(true)
    const supabase = createClient()
    const existing = new Set((budgets ?? []).map((b) => b.category))
    const keys = [TOTAL_KEY, ...PICKER_CATEGORIES.map(([id]) => id)]
    const upserts = []
    const removals = []
    for (const k of keys) {
      const n = parseAmount(vals[k])
      if (n > 0) upserts.push({ group_id: groupId, category: k, monthly_limit: n })
      else if (existing.has(k)) removals.push(k)
    }
    const ops = []
    if (upserts.length) ops.push(supabase.from('budgets').upsert(upserts, { onConflict: 'group_id,category' }))
    if (removals.length) ops.push(supabase.from('budgets').delete().eq('group_id', groupId).in('category', removals))
    const results = await Promise.all(ops)
    const err = results.find((r) => r.error)?.error
    setPending(false)
    if (err) return show(err.message, { type: 'error' })
    show('Budgets saved', { type: 'success' })
    onSaved?.()
    onOpenChange(false)
  }

  const row = (key, label) => (
    <TextField key={key} aria-label={`${label} monthly budget`} value={vals[key] ?? ''} onChange={(v) => setVals((s) => ({ ...s, [key]: v }))} inputMode="decimal" placeholder="No limit" className="flex-1" inputClassName="h-11 text-right" />
  )

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Monthly budgets"
      footer={<Button size="lg" isPending={pending} onPress={save}>Save budgets</Button>}
    >
      <Form onSubmit={(e) => { e.preventDefault(); save() }} className="flex flex-col gap-3 pb-4">
        <p className="text-sm text-muted">Set limits in {currency}. You’ll see progress and warnings at 80% and 100%.</p>
        <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-3">
          <span className="w-28 text-sm font-medium text-gold-soft">Overall</span>
          {row(TOTAL_KEY, 'Overall')}
        </div>
        {PICKER_CATEGORIES.map(([id, c]) => (
          <div key={id} className="flex items-center gap-3 px-1">
            <span className="w-28 text-sm text-ivory">{c.label}</span>
            {row(id, c.label)}
          </div>
        ))}
      </Form>
    </Sheet>
  )
}
