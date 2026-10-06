'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Sparkles, TrendingDown, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getCategory } from '@/lib/categories'
import { TOTAL_KEY, budgetStatus } from '@/lib/budgets'
import { buildInsights } from '@/lib/insights'
import { formatCurrency, formatMonth, monthRange, fitFontSize } from '@/lib/utils'
import { Button } from '../ui/Button'
import { Progress } from '../ui/Progress'
import { Skeleton } from '../ui/Skeleton'
import { CategoryIcon } from '../ui/CategoryIcon'
import BudgetSheet from './BudgetSheet'
import Donut from './Donut'

const TONE = {
  warn: { Icon: AlertTriangle, cls: 'text-coral' },
  good: { Icon: TrendingDown, cls: 'text-sage' },
  info: { Icon: Sparkles, cls: 'text-gold-soft' },
}
const BAR = { ok: '#c9a96a', near: '#e4b56a', over: '#e58b7f' }

export default function Overview({ group, month, isAdmin, reloadKey }) {
  const [summary, setSummary] = useState(null)
  const [budgets, setBudgets] = useState([])
  const [error, setError] = useState('')
  const [sheet, setSheet] = useState(false)
  const [local, setLocal] = useState(0)
  const { year, month: m } = month
  const currency = group.currency
  const fmt = useCallback((n) => formatCurrency(n, currency), [currency])

  useEffect(() => {
    let alive = true
    setSummary(null)
    const { from, to } = monthRange(year, m)
    const supabase = createClient()
    Promise.all([
      supabase.rpc('group_spend_summary', { p_group: group.id, p_from: from, p_to: to }),
      supabase.from('budgets').select('category, monthly_limit').eq('group_id', group.id),
    ]).then(([s, b]) => {
      if (!alive) return
      if (s.error) return setError(s.error.message)
      setError('')
      setSummary(s.data)
      setBudgets(b.data ?? [])
    })
    return () => { alive = false }
  }, [group.id, year, m, reloadKey, local])

  const total = Number(summary?.total ?? 0)
  const prev = Number(summary?.prev_total ?? 0)
  const delta = prev > 0 ? (total - prev) / prev : null
  const cats = useMemo(() => summary?.by_category ?? [], [summary])
  const insights = useMemo(() => buildInsights({ summary, budgets, year, month: m, fmt }), [summary, budgets, year, m, fmt])
  const status = useMemo(() => budgetStatus(budgets, cats, total), [budgets, cats, total])
  const trend = summary?.by_month ?? []
  const maxTrend = Math.max(1, ...trend.map((x) => Number(x.total)))
  const memberRows = summary?.by_member ?? []

  if (error) return <p role="alert" className="px-5 py-8 text-sm text-coral">{error}</p>
  if (!summary) return <div className="flex flex-col gap-4 px-5 py-6"><Skeleton className="h-40" /><Skeleton className="h-24" /><Skeleton className="h-56" /></div>

  return (
    <div className="flex flex-col gap-7 px-5 py-6">
      {/* Hero */}
      <section className="card relative overflow-hidden p-6 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 50% 0%, rgba(201,169,106,0.16), transparent 70%)' }} />
        <p className="eyebrow">Spent in {formatMonth(year, m, 'long')}</p>
        <p className="display num mt-2 font-semibold leading-none text-ivory" style={{ fontSize: fitFontSize(fmt(total), 52, 270) }}>{fmt(total)}</p>
        <div className="hairline mx-auto my-4 w-28" />
        <p className="flex items-center justify-center gap-3 text-sm text-muted">
          <span>{summary.count} {summary.count == 1 ? 'expense' : 'expenses'}</span>
          {delta !== null && (
            <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${delta > 0 ? 'border-coral/40 text-coral' : 'border-sage/40 text-sage'}`}>
              {delta > 0 ? <ArrowUpRight aria-hidden size={13} /> : <ArrowDownRight aria-hidden size={13} />}
              {Math.abs(Math.round(delta * 100))}% <span className="sr-only">{delta > 0 ? 'more' : 'less'} than last month</span><span aria-hidden className="text-faint">vs last month</span>
            </span>
          )}
        </p>
      </section>

      {summary.count === 0 && (
        <p className="py-6 text-center text-sm text-muted">Nothing logged this month. Tap <span className="text-gold-soft">+</span> to add the first expense.</p>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <section aria-labelledby="ins" className="flex flex-col gap-2">
          <h2 id="ins" className="eyebrow">Insights</h2>
          <ul className="card flex flex-col divide-y divide-line p-0">
            {insights.map((i) => {
              const { Icon, cls } = TONE[i.tone]
              return (
                <li key={i.id} className="flex items-start gap-3 px-4 py-3.5 text-[14px] leading-snug">
                  <Icon aria-hidden size={17} className={`mt-0.5 shrink-0 ${cls}`} strokeWidth={1.7} />
                  <span>{i.text}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Budgets */}
      {(status.length > 0 || isAdmin) && (
        <section aria-labelledby="bud" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="bud" className="eyebrow">Budgets</h2>
            {isAdmin && <Button variant="quiet" size="sm" onPress={() => setSheet(true)}>{status.length ? 'Edit' : 'Set up'}</Button>}
          </div>
          {status.length === 0 ? (
            <button onClick={() => setSheet(true)} className="card flex items-center gap-3 text-left text-sm text-muted outline-none focus-visible:ring-2 focus-visible:ring-gold-soft">
              <Target aria-hidden size={20} className="text-gold" strokeWidth={1.5} />
              Set monthly limits and we’ll warn you before you overspend.
            </button>
          ) : (
            <div className="card flex flex-col gap-5">
              {status.map((b) => {
                const isTotal = b.category === TOTAL_KEY
                const name = isTotal ? 'Overall' : getCategory(b.category).label
                return (
                  <div key={b.category} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className={isTotal ? 'font-medium text-gold-soft' : ''}>{name}</span>
                      <span className="num text-xs text-muted">
                        <span className={b.state === 'over' ? 'text-coral' : 'text-ivory'}>{fmt(b.spent)}</span> / {fmt(b.limit)}
                      </span>
                    </div>
                    <Progress value={b.pct * 100} label={`${name} budget used`} color={BAR[b.state]} />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Categories */}
      {cats.length > 0 && (
        <section aria-labelledby="cat" className="flex flex-col gap-3">
          <h2 id="cat" className="eyebrow">By category</h2>
          <div className="card flex items-center gap-5">
            <Donut slices={cats} total={total} label={`Spending split across ${cats.length} categories`} />
            <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
              {cats.slice(0, 5).map((c) => (
                <li key={c.category} className="flex items-center gap-2 text-xs">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: getCategory(c.category).color }} />
                  <span className="flex-1 truncate text-ivory">{getCategory(c.category).label}</span>
                  <span className="num text-muted">{Math.round((c.total / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className="flex flex-col gap-2">
            {cats.map((c) => (
              <li key={c.category} className="card flex items-center gap-3 p-3.5">
                <CategoryIcon id={c.category} size={40} />
                <span className="flex-1 text-[15px]">{getCategory(c.category).label}</span>
                <span className="num text-[15px]">{fmt(c.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Members */}
      {memberRows.length > 1 && (
        <section aria-labelledby="mem" className="flex flex-col gap-3">
          <h2 id="mem" className="eyebrow">Who spent</h2>
          <div className="card flex flex-col gap-4">
            {memberRows.map((r) => (
              <div key={r.user_id} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-sm"><span>{r.name}</span><span className="num text-muted">{fmt(r.total)}</span></div>
                <Progress value={total ? (r.total / total) * 100 : 0} label={`${r.name}'s share of spending`} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trend */}
      {trend.length > 1 && (
        <section aria-labelledby="trend" className="flex flex-col gap-3">
          <h2 id="trend" className="eyebrow">Last 6 months</h2>
          <div className="card">
            <ul className="flex h-32 items-end gap-2.5">
              {trend.map((x) => {
                const current = x.month === `${year}-${String(m + 1).padStart(2, '0')}`
                return (
                  <li key={x.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2" aria-label={`${x.month}: ${fmt(x.total)}`}>
                    <span className="w-full rounded-t-lg" style={{ height: `${(Number(x.total) / maxTrend) * 100}%`, minHeight: 3, background: current ? 'linear-gradient(#e4cf9e,#c9a96a)' : 'rgba(201,169,106,0.28)' }} />
                    <span aria-hidden className="text-[10px] text-faint">{new Date(`${x.month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}

      <BudgetSheet isOpen={sheet} onOpenChange={setSheet} groupId={group.id} currency={group.currency} budgets={budgets} onSaved={() => setLocal((n) => n + 1)} />
    </div>
  )
}
