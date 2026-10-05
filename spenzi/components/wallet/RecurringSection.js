'use client'
import { useCallback, useEffect, useState } from 'react'
import { Repeat, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getCategory } from '@/lib/categories'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CategoryIcon } from '../ui/CategoryIcon'
import { IconButton } from '../ui/Button'
import { ConfirmSheet } from '../ui/Sheet'
import { Switch } from '../ui/Switch'
import { useToast } from '../ui/Toast'

const FREQ = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

export default function RecurringSection({ group, user, isAdmin }) {
  const { show } = useToast()
  const [rows, setRows] = useState(null)
  const [removing, setRemoving] = useState(null)

  const load = useCallback(async () => {
    const { data } = await createClient().from('recurring_expenses').select('*').eq('group_id', group.id).order('next_due')
    setRows(data ?? [])
  }, [group.id])
  useEffect(() => { load() }, [load])

  async function toggle(r, active) {
    const { error } = await createClient().from('recurring_expenses').update({ active }).eq('id', r.id)
    if (error) show(error.message, { type: 'error' })
    load()
  }
  async function remove() {
    const { error } = await createClient().from('recurring_expenses').delete().eq('id', removing.id)
    if (error) show(error.message, { type: 'error' }); else show('Repeat removed', { type: 'success' })
    load()
  }

  if (!rows?.length) return null
  return (
    <section aria-labelledby="rec" className="flex flex-col gap-3">
      <h2 id="rec" className="eyebrow flex items-center gap-2"><Repeat aria-hidden size={13} /> Repeating expenses</h2>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const mine = isAdmin || r.created_by === user.id
          const name = r.description || getCategory(r.category).label
          return (
            <li key={r.id} className={`card flex items-center gap-3 p-3.5 ${r.active ? '' : 'opacity-60'}`}>
              <CategoryIcon id={r.category} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px]">{name}</span>
                <span className="text-xs text-muted">{FREQ[r.frequency]} · <span className="num">{formatCurrency(r.amount, group.currency)}</span> · {r.active ? `next ${formatDate(r.next_due)}` : 'paused'}</span>
              </span>
              {mine && (
                <>
                  <Switch aria-label={`${r.active ? 'Pause' : 'Resume'} ${name}`} isSelected={r.active} onChange={(v) => toggle(r, v)} className="[&>span:first-child]:sr-only" />
                  <IconButton label={`Delete repeating ${name}`} variant="quiet" onPress={() => setRemoving(r)}><Trash2 size={16} /></IconButton>
                </>
              )}
            </li>
          )
        })}
      </ul>
      <ConfirmSheet isOpen={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title="Stop repeating?" message="Past expenses stay; no new ones will be created." confirmLabel="Stop repeating" danger onConfirm={remove} />
    </section>
  )
}
