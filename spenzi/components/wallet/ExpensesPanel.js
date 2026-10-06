'use client'
import { useEffect, useMemo, useState } from 'react'
import { Link, SearchField, Input } from 'react-aria-components'
import { Search, Download, ReceiptText, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getCategory, CATEGORIES } from '@/lib/categories'
import { toCSV, downloadCSV } from '@/lib/csv'
import { formatCurrency, formatMonth, monthRange, toISODate } from '@/lib/utils'
import { CategoryIcon } from '../ui/CategoryIcon'
import { IconButton } from '../ui/Button'
import { ListSkeleton } from '../ui/Skeleton'
import { Select } from '../ui/Select'
import { useToast } from '../ui/Toast'

const ALL = 'all'

function dayLabel(iso) {
  const today = new Date()
  const y = new Date(today); y.setDate(today.getDate() - 1)
  if (iso === toISODate(today)) return 'Today'
  if (iso === toISODate(y)) return 'Yesterday'
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function ExpensesPanel({ group, members, user, isAdmin, canWrite, month, reloadKey }) {
  const { show } = useToast()
  const [rows, setRows] = useState(null)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState(ALL)
  const [who, setWho] = useState(ALL)
  const { year, month: m } = month

  useEffect(() => {
    let alive = true
    setRows(null)
    const { from, to } = monthRange(year, m)
    createClient()
      .from('expenses')
      .select('*, profiles(name), expense_splits(user_id)')
      .eq('group_id', group.id).gte('date', from).lte('date', to)
      .order('date', { ascending: false }).order('created_at', { ascending: false }).limit(1000)
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { show(error.message, { type: 'error' }); setRows([]) } else setRows(data ?? [])
      })
    return () => { alive = false }
  }, [group.id, year, m, reloadKey, show])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (rows ?? []).filter((e) =>
      (cat === ALL || e.category === cat) &&
      (who === ALL || e.paid_by === who) &&
      (!q || `${e.description ?? ''} ${getCategory(e.category).label} ${e.profiles?.name ?? ''}`.toLowerCase().includes(q))
    )
  }, [rows, query, cat, who])

  const groups = useMemo(() => {
    const map = new Map()
    for (const e of filtered) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return [...map.entries()]
  }, [filtered])

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0)
  const catItems = useMemo(() => {
    const present = [...new Set((rows ?? []).map((e) => e.category))]
    return [{ id: ALL, label: 'All categories' }, ...present.map((id) => ({ id, label: getCategory(id).label }))]
  }, [rows])
  const whoItems = [{ id: ALL, label: 'Everyone' }, ...members.map((mb) => ({ id: mb.user_id, label: mb.profiles?.name ?? 'Unknown' }))]

  function exportCSV() {
    const csv = toCSV(filtered, [
      { header: 'Date', value: (e) => e.date },
      { header: 'Description', value: (e) => e.description ?? '' },
      { header: 'Category', value: (e) => getCategory(e.category).label },
      { header: group.type === 'split' ? 'Paid by' : 'Spent by', value: (e) => e.profiles?.name ?? '' },
      { header: `Amount (${group.currency})`, value: (e) => Number(e.amount).toFixed(2), numeric: true },
    ])
    downloadCSV(`familywallet-${group.name.replace(/[^\w]+/g, '-').toLowerCase()}-${year}-${String(m + 1).padStart(2, '0')}.csv`, csv)
    show(`Exported ${filtered.length} expenses`, { type: 'success' })
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <div className="flex items-center gap-2">
        <SearchField value={query} onChange={setQuery} aria-label="Search expenses" className="relative flex-1">
          <Search aria-hidden size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
          <Input placeholder="Search" className="h-11 w-full rounded-full border border-line bg-white/[0.04] pl-10 pr-4 text-base text-ivory outline-none placeholder:text-faint data-[focused]:border-gold/70" />
        </SearchField>
        <IconButton label="Export this month as CSV" isDisabled={!filtered.length} onPress={exportCSV}><Download size={18} /></IconButton>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select aria-label="Filter by category" items={catItems} selectedKey={cat} onSelectionChange={setCat} compact />
        {members.length > 1 && <Select aria-label="Filter by person" items={whoItems} selectedKey={who} onSelectionChange={setWho} compact />}
      </div>

      {rows === null ? (
        <ListSkeleton rows={5} className="h-[68px]" />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ReceiptText aria-hidden size={36} strokeWidth={1.2} className="text-gold/60" />
          <p className="display text-xl">{rows.length ? 'No matches' : 'No expenses yet'}</p>
          <p className="text-sm text-muted">{rows.length ? 'Try a different search or filter.' : `Nothing in ${formatMonth(year, m)}.`}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted">{filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'} · <span className="num text-ivory">{formatCurrency(total, group.currency)}</span></p>
          {groups.map(([date, items]) => (
            <section key={date} aria-label={dayLabel(date)} className="flex flex-col gap-2">
              <h3 className="eyebrow pt-2">{dayLabel(date)}</h3>
              {items.map((e) => {
                const editable = isAdmin || (canWrite && e.paid_by === user.id)
                const splitN = e.expense_splits?.length ?? 0
                const inner = (
                  <>
                    <CategoryIcon id={e.category} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{e.description || getCategory(e.category).label}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        {e.paid_by === user.id ? 'You' : e.profiles?.name ?? 'Unknown'} · {getCategory(e.category).label}
                        {splitN > 1 && <span className="flex items-center gap-1 text-faint"><Users aria-hidden size={11} />{splitN}</span>}
                      </span>
                    </span>
                    <span className="num text-[15px] font-medium">{formatCurrency(e.amount, group.currency)}</span>
                  </>
                )
                return editable ? (
                  <Link key={e.id} href={`/groups/${group.id}/expense/${e.id}`} aria-label={`Edit ${e.description || getCategory(e.category).label}, ${formatCurrency(e.amount, group.currency)}`}
                    className="card flex items-center gap-3 p-3.5 outline-none transition data-[hovered]:border-gold/40 data-[pressed]:scale-[0.99] data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft">{inner}</Link>
                ) : (
                  <div key={e.id} className="card flex items-center gap-3 p-3.5">{inner}</div>
                )
              })}
            </section>
          ))}
        </>
      )}
    </div>
  )
}
