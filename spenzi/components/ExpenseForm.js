'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button as RACButton, CheckboxGroup, Checkbox, Label, Form } from 'react-aria-components'
import { ChevronDown, Check, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getRecentCategories, pushRecentCategory, saveExpense } from '@/lib/api'
import { nextAmount, displayAmount, toEditable } from '@/lib/amount'
import { parseAmount, todayISO, formatCurrency, fitFontSize } from '@/lib/utils'
import Keypad from './Keypad'
import CategoryPicker from './CategoryPicker'
import PageHeader from './PageHeader'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'
import { ConfirmSheet } from './ui/Sheet'
import { Select } from './ui/Select'
import { Switch } from './ui/Switch'
import { TextField } from './ui/TextField'
import { useToast } from './ui/Toast'

const FREQUENCIES = [
  { id: 'weekly', label: 'Every week' },
  { id: 'monthly', label: 'Every month' },
  { id: 'yearly', label: 'Every year' },
]

const newId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16)))
export const notifyExpensesChanged = () => window.dispatchEvent(new Event('fw:expenses-changed'))

/**
 * One form for add + edit.  Amount-first: keypad, recent-category chips, one tap to save.
 * `expense` (edit mode): { id, amount, category, description, date, paid_by, splitUsers }
 */
export default function ExpenseForm({ group, members, user, expense }) {
  const router = useRouter()
  const { show } = useToast()
  const editing = !!expense
  const isSplit = group.type === 'split'
  const memberIds = members.map((m) => m.user_id)

  const idRef = useRef(expense?.id ?? newId()) // stable across retries/double-taps => idempotent save
  const [amount, setAmount] = useState(editing ? toEditable(expense.amount) : '')
  const [category, setCategory] = useState(expense?.category ?? getRecentCategories(group.id)[0] ?? 'groceries')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [date, setDate] = useState(expense?.date ?? todayISO())
  const [paidBy, setPaidBy] = useState(expense?.paid_by ?? user.id)
  const [splitUsers, setSplitUsers] = useState(expense?.splitUsers?.length ? expense.splitUsers : memberIds)
  const [repeat, setRepeat] = useState(false)
  const [frequency, setFrequency] = useState('monthly')
  const [detailsOpen, setDetailsOpen] = useState(isSplit)
  const [pending, setPending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const recent = useMemo(() => getRecentCategories(group.id), [group.id])

  // physical keyboard: type the amount without focusing anything
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target.closest?.('input, textarea, select, [role="dialog"], [role="listbox"]')) return
      if (/^\d$/.test(e.key)) setAmount((a) => nextAmount(a, e.key))
      else if (e.key === '.' || e.key === ',') setAmount((a) => nextAmount(a, 'dot'))
      else if (e.key === 'Backspace') setAmount((a) => nextAmount(a, 'back'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = parseAmount(amount)
  const perPerson = isSplit && splitUsers.length ? value / splitUsers.length : 0
  const canSave = value > 0 && (!isSplit || splitUsers.length > 0)
  const paidOptions = members.map((m) => ({ id: m.user_id, label: `${m.profiles?.name ?? 'Unknown'}${m.user_id === user.id ? ' (you)' : ''}` }))
  const back = `/groups/${group.id}`

  async function submit() {
    if (!canSave || pending) return
    setPending(true)
    const payload = { id: idRef.current, groupId: group.id, paidBy, amount: value, category, description: description.trim(), date, splitUsers: isSplit ? splitUsers : [] }
    const supabase = createClient()

    if (repeat && !editing) {
      // Recurring: the server materialises occurrences (drift-free), starting with today's/past ones.
      const { error } = await supabase.from('recurring_expenses').insert({
        group_id: group.id, paid_by: paidBy, amount: value, category, description: description.trim() || null,
        frequency, start_date: date, next_due: date, split_users: isSplit ? splitUsers : [],
      })
      if (!error) {
        await supabase.rpc('apply_recurring', { p_group: group.id })
        pushRecentCategory(group.id, category)
        notifyExpensesChanged()
        show(`Saved — repeats ${FREQUENCIES.find((f) => f.id === frequency).label.toLowerCase()}`, { type: 'success' })
        return router.replace(back)
      }
      show(`Couldn't set repeat (${error.message}). Saving once instead.`, { type: 'error' })
    }

    const res = await saveExpense(payload)
    if (res.error) { show(res.error.message, { type: 'error' }); setPending(false); return }
    pushRecentCategory(group.id, category)
    notifyExpensesChanged()
    show(res.queued ? 'Saved offline — will sync when you’re back online' : editing ? 'Expense updated' : 'Expense added', { type: 'success' })
    router.replace(back)
  }

  async function remove() {
    const snapshot = { id: expense.id, groupId: group.id, paidBy: expense.paid_by, amount: Number(expense.amount), category: expense.category, description: expense.description ?? '', date: expense.date, splitUsers: expense.splitUsers ?? [] }
    const { error } = await createClient().from('expenses').delete().eq('id', expense.id)
    if (error) return show(error.message, { type: 'error' })
    notifyExpensesChanged()
    router.replace(back)
    show('Expense deleted', {
      action: { label: 'Undo', onPress: async () => { const r = await saveExpense(snapshot); if (r.error) show(r.error.message, { type: 'error' }); else { notifyExpensesChanged(); show('Restored', { type: 'success' }) } } },
    })
  }

  return (
    <div className="flex h-dvh max-w-lg flex-col bg-shell mx-auto">
      <PageHeader back={back} title={editing ? 'Edit expense' : 'Add expense'} sticky={false}>
        <span className="max-w-[38%] shrink-0 truncate rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-medium text-gold-soft">{group.name}</span>
      </PageHeader>

      <Form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-5">
          {/* Amount */}
          <div className="py-7 text-center" role="group" aria-label="Amount">
            <p className="eyebrow mb-1">{group.currency}</p>
            <p
              aria-live="polite"
              className={`display num font-semibold leading-none ${amount ? 'text-ivory' : 'text-faint'}`}
              style={{ fontSize: fitFontSize(displayAmount(amount), 64, 320) }}
            >
              {displayAmount(amount)}
            </p>
            <div className="hairline mx-auto mt-4 w-28" />
            <p className="mt-3 h-5 text-xs text-muted">
              {isSplit && value > 0 && splitUsers.length > 0 && `${formatCurrency(perPerson, group.currency)} each · ${splitUsers.length} ${splitUsers.length === 1 ? 'person' : 'people'}`}
            </p>
          </div>

          <div className="flex flex-col gap-5 pb-4">
            <CategoryPicker value={category} onChange={setCategory} recent={recent} />
            <TextField aria-label="Note" value={description} onChange={setDescription} placeholder="Add a note (optional)" maxLength={120} />

            <RACButton
              onPress={() => setDetailsOpen((o) => !o)}
              aria-expanded={detailsOpen}
              className="flex items-center justify-between rounded-2xl py-1 text-sm text-muted outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft"
            >
              {isSplit ? 'Date, payer & split' : 'More details'}
              <ChevronDown aria-hidden size={16} className={`transition ${detailsOpen ? 'rotate-180' : ''}`} />
            </RACButton>

            {detailsOpen && (
              <div className="flex animate-rise flex-col gap-5">
                <TextField label="Date" type="date" value={date} onChange={setDate} isRequired max="2100-01-01" />
                {members.length > 1 && (
                  <Select label={isSplit ? 'Paid by' : 'Spent by'} items={paidOptions} selectedKey={paidBy} onSelectionChange={setPaidBy} />
                )}
                {isSplit && (
                  <CheckboxGroup value={splitUsers} onChange={setSplitUsers} className="flex flex-col gap-2">
                    <Label className="eyebrow">Split equally between</Label>
                    {members.map((m) => (
                      <Checkbox key={m.user_id} value={m.user_id} className="group card flex min-h-14 cursor-pointer items-center gap-3 p-3 outline-none data-[selected]:border-gold/50 data-[selected]:bg-gold/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft">
                        <Avatar name={m.profiles?.name} color={m.profiles?.avatar_color} size={32} />
                        <span className="flex-1 text-[15px]">{m.profiles?.name}{m.user_id === user.id && ' (you)'}</span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line transition group-data-[selected]:border-gold group-data-[selected]:bg-gold">
                          <Check aria-hidden size={14} className="text-ink opacity-0 group-data-[selected]:opacity-100" />
                        </span>
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                )}
                {!editing && (
                  <div className="card flex flex-col gap-4">
                    <Switch isSelected={repeat} onChange={setRepeat}>Repeat this expense</Switch>
                    {repeat && <Select aria-label="Frequency" items={FREQUENCIES} selectedKey={frequency} onSelectionChange={setFrequency} compact />}
                  </div>
                )}
                {editing && (
                  <Button variant="danger" onPress={() => setConfirmDelete(true)}><Trash2 aria-hidden size={16} /> Delete expense</Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="safe-bottom border-t border-line bg-shell px-4 pt-2">
          <Keypad onKey={(k) => setAmount((a) => nextAmount(a, k))} />
          <Button type="submit" size="lg" isDisabled={!canSave} isPending={pending} className="mt-2">
            {editing ? 'Save changes' : 'Save expense'}
          </Button>
        </div>
      </Form>

      <ConfirmSheet
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete expense?"
        message="You can undo this for a few seconds afterwards."
        confirmLabel="Delete"
        danger
        onConfirm={remove}
      />
    </div>
  )
}
