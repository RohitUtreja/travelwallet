'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { CATEGORIES, formatCurrency } from '@/lib/utils'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function Bar({ pct, color }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function SpendSummary({ groupId, currency }) {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setData(null)
    setError('')
    const pad = (n) => String(n).padStart(2, '0')
    const from = `${ym.y}-${pad(ym.m + 1)}-01`
    const to = `${ym.y}-${pad(ym.m + 1)}-${pad(new Date(ym.y, ym.m + 1, 0).getDate())}`
    createClient()
      .rpc('group_spend_summary', { p_group: groupId, p_from: from, p_to: to })
      .then(({ data, error }) => (error ? setError(error.message) : setData(data)))
  }, [groupId, ym])

  const shift = (d) => setYm(({ y, m }) => {
    const n = y * 12 + m + d
    return { y: Math.floor(n / 12), m: n % 12 }
  })
  const isCurrent = ym.y === now.getFullYear() && ym.m === now.getMonth()

  const total = Number(data?.total ?? 0)
  const cats = data?.by_category ?? []
  const members = data?.by_member ?? []
  const months = data?.by_month ?? []
  const maxMonth = Math.max(1, ...months.map((x) => Number(x.total)))
  const avg = months.length ? months.reduce((s, x) => s + Number(x.total), 0) / months.length : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} className="w-9 h-9 rounded-xl glass flex items-center justify-center" aria-label="Previous month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ebebeb" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="mono text-[13px] font-semibold tracking-wider">{MONTHS[ym.m]} {ym.y}</span>
        <button onClick={() => shift(1)} disabled={isCurrent} className="w-9 h-9 rounded-xl glass flex items-center justify-center" style={{ opacity: isCurrent ? 0.3 : 1 }} aria-label="Next month">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ebebeb" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {error && <p className="mono text-xs" style={{ color: '#ff4d4d' }}>{error}</p>}

      <div className="card p-5 flex flex-col gap-1" style={{ border: '1px solid rgba(204,255,0,0.15)', background: 'rgba(204,255,0,0.03)' }}>
        <span className="mono text-[10px] tracking-[0.15em]" style={{ color: 'rgba(235,235,235,0.4)' }}>// TOTAL SPENT</span>
        {data ? (
          <span className="mono" style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-1px' }}>{formatCurrency(total, currency)}</span>
        ) : (
          <div className="h-10 w-40 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
        )}
        {data && (
          <span className="mono text-[10px]" style={{ color: 'rgba(235,235,235,0.3)' }}>
            {data.count} expenses · 6-mo avg {formatCurrency(avg, currency)}
          </span>
        )}
      </div>

      {cats.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="section-label">// By Category</span>
          {cats.map((c) => {
            const info = CATEGORIES[c.category] ?? CATEGORIES.other
            return (
              <div key={c.category} className="flex items-center gap-3">
                <span className="text-lg w-7">{info.emoji}</span>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-[13px]">
                    <span>{info.label} <span className="mono text-[10px]" style={{ color: 'rgba(235,235,235,0.35)' }}>{total ? Math.round((c.total / total) * 100) : 0}%</span></span>
                    <span className="mono text-xs font-semibold">{formatCurrency(c.total, currency)}</span>
                  </div>
                  <Bar pct={total ? (c.total / total) * 100 : 0} color={info.color} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {members.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="section-label">// By Member</span>
          {members.map((m) => (
            <div key={m.user_id} className="flex flex-col gap-1">
              <div className="flex justify-between text-[13px]">
                <span>{m.name}</span>
                <span className="mono text-xs font-semibold">{formatCurrency(m.total, currency)}</span>
              </div>
              <Bar pct={total ? (m.total / total) * 100 : 0} color="#ccff00" />
            </div>
          ))}
        </div>
      )}

      {months.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="section-label">// 6-Month Trend</span>
          <div className="flex items-end gap-2 h-28">
            {months.map((x) => (
              <div key={x.month} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                <div className="w-full rounded-t-md" style={{ height: `${(Number(x.total) / maxMonth) * 100}%`, minHeight: '3px', background: x.month === `${ym.y}-${String(ym.m + 1).padStart(2, '0')}` ? '#ccff00' : 'rgba(204,255,0,0.3)' }} />
                <span className="mono text-[9px]" style={{ color: 'rgba(235,235,235,0.4)' }}>{MONTHS[Number(x.month.slice(5)) - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.count === 0 && (
        <p className="mono text-[11px] text-center py-8" style={{ color: 'rgba(235,235,235,0.3)' }}>NO SPEND THIS MONTH</p>
      )}
    </div>
  )
}
