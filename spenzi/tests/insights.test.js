import { describe, it, expect } from 'vitest'
import { buildInsights } from '../lib/insights'
import { budgetStatus } from '../lib/budgets'

const fmt = (n) => `$${Math.round(n)}`
const base = {
  count: 12, total: 1500, prev_total: 1000,
  by_category: [{ category: 'eatingout', total: 600 }, { category: 'rent', total: 900 }],
  prev_by_category: [{ category: 'eatingout', total: 300 }, { category: 'rent', total: 700 }],
  top_expense: { amount: 900, category: 'rent', description: 'October rent' },
}
const mid = new Date(2026, 9, 15) // Oct 15 2026

describe('budgetStatus', () => {
  it('classifies ok / near / over and handles the overall key', () => {
    const s = budgetStatus(
      [{ category: 'rent', monthly_limit: 900 }, { category: 'eatingout', monthly_limit: 700 }, { category: 'fuel', monthly_limit: 100 }, { category: '_total', monthly_limit: 3000 }],
      base.by_category, 1500)
    const by = Object.fromEntries(s.map((b) => [b.category, b.state]))
    expect(by).toEqual({ rent: 'over', eatingout: 'near', fuel: 'ok', _total: 'ok' })
    expect(s[0].category).toBe('_total') // overall first
  })
  it('ignores zero limits', () => expect(budgetStatus([{ category: 'rent', monthly_limit: 0 }], [], 0)).toEqual([]))
})

describe('buildInsights', () => {
  it('returns nothing for an empty month', () => {
    expect(buildInsights({ summary: { count: 0 }, year: 2026, month: 9, today: mid, fmt })).toEqual([])
    expect(buildInsights({ summary: null, year: 2026, month: 9, today: mid, fmt })).toEqual([])
  })
  it('reports month-over-month and the biggest category mover', () => {
    const t = buildInsights({ summary: base, year: 2026, month: 9, today: mid, fmt, max: 10 }).map((i) => i.text)
    expect(t).toContain('Spending is up 50% on last month')
    expect(t).toContain('Eating out spending is up 100% on last month')
  })
  it('puts budget warnings first', () => {
    const r = buildInsights({ summary: base, budgets: [{ category: 'rent', monthly_limit: 800 }], year: 2026, month: 9, today: mid, fmt })
    expect(r[0]).toMatchObject({ tone: 'warn', text: 'Rent budget exceeded by $100' })
  })
  it('projects the month only while it is current', () => {
    const cur = buildInsights({ summary: base, year: 2026, month: 9, today: mid, fmt, max: 10 })
    // rent (900) is lumpy: 900 + (600/15)*31 = 2140
    expect(cur.find((i) => i.id === 'projection').text).toBe('On pace for $2140 this month')
    const past = buildInsights({ summary: base, year: 2026, month: 8, today: mid, fmt, max: 10 })
    expect(past.find((i) => i.id === 'projection')).toBeUndefined()
  })
  it('waits for enough of the month before projecting', () => {
    const early = buildInsights({ summary: base, year: 2026, month: 9, today: new Date(2026, 9, 5), fmt, max: 10 })
    expect(early.find((i) => i.id === 'projection')).toBeUndefined()
  })
  it('does not extrapolate rent-like lump sums', () => {
    const s = { ...base, total: 1000, by_category: [{ category: 'rent', total: 1000 }] }
    const r = buildInsights({ summary: s, year: 2026, month: 9, today: mid, fmt, max: 10 })
    expect(r.find((i) => i.id === 'projection').text).toBe('On pace for $1000 this month')
  })
  it('warns when the run-rate will break the overall budget', () => {
    const r = buildInsights({ summary: { ...base, total: 1000, by_category: [{ category: 'eatingout', total: 1000 }] }, budgets: [{ category: '_total', monthly_limit: 1500 }], year: 2026, month: 9, today: mid, fmt, max: 10 })
    expect(r.find((i) => i.id === 'projection')).toMatchObject({ tone: 'warn' })
  })
  it('does not compare against a zero base', () => {
    const t = buildInsights({ summary: { ...base, prev_total: 0, prev_by_category: [] }, year: 2026, month: 9, today: mid, fmt, max: 10 }).map((i) => i.text)
    expect(t.some((x) => /last month/.test(x))).toBe(false)
  })
  it('caps the list', () => {
    expect(buildInsights({ summary: base, year: 2026, month: 9, today: mid, fmt, max: 2 })).toHaveLength(2)
  })
})
