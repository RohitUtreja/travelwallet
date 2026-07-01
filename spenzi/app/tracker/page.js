'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { CATEGORIES, formatCurrency, getCategoryEmoji } from '@/lib/utils'
import BottomNav from '@/components/BottomNav'
import Toast, { useToast } from '@/components/Toast'

function prevMonth(year, month) {
  return month === 0 ? [year - 1, 11] : [year, month - 1]
}
function nextMonth(year, month) {
  return month === 11 ? [year + 1, 0] : [year, month + 1]
}
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function TrackerPage() {
  const router = useRouter()
  const { toasts, showToast } = useToast()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [expenses, setExpenses] = useState([])
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login'); return }

    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

    const [{ data: profileData }, { data: expData }] = await Promise.all([
      supabase.from('profiles').select('tracker_currency').eq('id', session.user.id).single(),
      supabase.from('personal_expenses')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false }),
    ])

    setCurrency(profileData?.tracker_currency ?? 'USD')
    setExpenses(expData ?? [])
    setLoading(false)
  }, [year, month, router])

  useEffect(() => { load() }, [load])

  async function deleteExpense(id) {
    const supabase = createClient()
    const { error } = await supabase.from('personal_expenses').delete().eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  // Compute totals
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  const byCategory = {}
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount)
  }
  const categoryRows = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const maxCatAmount = categoryRows[0]?.[1] ?? 1

  function navMonth(dir) {
    if (dir === -1) {
      const [y, m] = prevMonth(year, month)
      setYear(y); setMonth(m); setLoading(true)
    } else {
      const [y, m] = nextMonth(year, month)
      setYear(y); setMonth(m); setLoading(true)
    }
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  return (
    <div className="page-container">
      <Toast toasts={toasts} />

      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4 safe-area-top border-b sticky top-0 z-30" style={{ background: '#0c0c0c', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em' }}>Tracker</h1>
          <p className="mono text-[10px] mt-0.5" style={{ color: 'rgba(235,235,235,0.35)' }}>personal &amp; family expenses</p>
        </div>
        <span className="mono text-[10px] px-2 py-1 rounded-full" style={{ color: '#ccff00', background: 'rgba(204,255,0,0.08)', border: '1px solid rgba(204,255,0,0.2)' }}>
          {currency}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(68px + env(safe-area-inset-bottom))' }}>
        <div className="flex flex-col gap-5 px-5 py-5">

          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navMonth(-1)}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ebebeb" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em' }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              onClick={() => navMonth(1)}
              disabled={isCurrentMonth}
              className="w-9 h-9 rounded-xl glass flex items-center justify-center"
              style={{ opacity: isCurrentMonth ? 0.3 : 1 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ebebeb" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Total card */}
          <div className="card p-5 flex flex-col gap-1" style={{ border: '1px solid rgba(204,255,0,0.15)', background: 'rgba(204,255,0,0.03)' }}>
            <span className="mono text-[10px] tracking-[0.15em]" style={{ color: 'rgba(235,235,235,0.4)' }}>// TOTAL SPENT</span>
            {loading ? (
              <div className="h-10 w-40 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
            ) : (
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '36px', fontWeight: 700, letterSpacing: '-1px', color: '#ebebeb' }}>
                {formatCurrency(total, currency)}
              </span>
            )}
            <span className="mono text-[10px]" style={{ color: 'rgba(235,235,235,0.3)' }}>
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} this month
            </span>
          </div>

          {/* Category breakdown */}
          {!loading && categoryRows.length > 0 && (
            <div className="flex flex-col gap-3">
              <span className="section-label">// By Category</span>
              {categoryRows.map(([cat, amt]) => {
                const info = CATEGORIES[cat] ?? CATEGORIES.other
                const pct = (amt / maxCatAmount) * 100
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-lg w-7 flex-shrink-0">{info.emoji}</span>
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 500 }}>{info.label}</span>
                        <span className="mono text-xs font-semibold">{formatCurrency(amt, currency)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: info.color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Expense list */}
          {!loading && expenses.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="section-label">// Expenses</span>
              {expenses.map((exp) => {
                const info = CATEGORIES[exp.category] ?? CATEGORIES.other
                return (
                  <div key={exp.id} className="card flex items-center gap-3 px-4 py-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${info.color}18`, border: `1px solid ${info.color}30` }}
                    >
                      {info.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {exp.description || info.label}
                      </p>
                      <p className="mono text-[10px] mt-0.5" style={{ color: 'rgba(235,235,235,0.35)' }}>
                        {exp.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="mono text-sm font-semibold">{formatCurrency(exp.amount, currency)}</span>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && expenses.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16">
              <span className="text-5xl">🧾</span>
              <p className="mono text-[11px] tracking-[0.15em]" style={{ color: 'rgba(235,235,235,0.3)' }}>NO EXPENSES THIS MONTH</p>
              <Link href="/tracker/add" className="btn-primary px-6 py-2.5 text-sm" style={{ display: 'inline-block' }}>
                Add First Expense
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <Link
        href="/tracker/add"
        className="fixed z-20 flex items-center justify-center rounded-full"
        style={{ bottom: 'calc(82px + env(safe-area-inset-bottom))', right: '20px', width: '56px', height: '56px', background: '#ccff00', boxShadow: '0 0 30px rgba(204,255,0,0.35)' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </Link>

      <BottomNav />
    </div>
  )
}
