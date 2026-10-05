import { describe, it, expect } from 'vitest'
import { safeNext, parseAmount, simplifyDebts, computeBalances, monthRange, shiftMonth, toISODate } from '../lib/utils'

describe('parseAmount', () => {
  it.each([
    ['35,24', 35.24],        // decimal comma (mobile keyboards)
    ['35.24', 35.24],
    ['1,234.50', 1234.5],    // US thousands
    ['1.234,50', 1234.5],    // EU thousands
    ['1,234', 1234],         // 3 digits after comma => thousands
    ['1.234.567', 1234567],
    ['₹ 2,50,000', 250000],  // Indian grouping
    ['12,5', 12.5],
    ['', 0], ['abc', 0], [null, 0], [undefined, 0],
  ])('%s -> %s', (input, want) => expect(parseAmount(input)).toBe(want))

  it('rounds to cents', () => expect(parseAmount('0.005')).toBe(0.01))
})

describe('dates', () => {
  it('toISODate uses local fields, not UTC', () => {
    // 00:30 local on the 5th must stay the 5th regardless of timezone offset
    expect(toISODate(new Date(2026, 9, 5, 0, 30))).toBe('2026-10-05')
  })
  it('monthRange handles leap years and month lengths', () => {
    expect(monthRange(2024, 1)).toEqual({ from: '2024-02-01', to: '2024-02-29' })
    expect(monthRange(2026, 11)).toEqual({ from: '2026-12-01', to: '2026-12-31' })
  })
  it('shiftMonth wraps years in both directions', () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth({ year: 2026, month: 5 }, -18)).toEqual({ year: 2024, month: 11 })
  })
})

describe('debts', () => {
  const members = ['a', 'b', 'c'].map((id) => ({ user_id: id, profiles: { name: id } }))
  it('balances sum to zero and simplification settles everyone', () => {
    const expenses = [{ id: 1, paid_by: 'a', amount: 90 }]
    const splits = ['a', 'b', 'c'].map((u) => ({ expense_id: 1, user_id: u, amount: 30 }))
    const bal = computeBalances(expenses, splits, [], members)
    expect(bal.reduce((s, b) => s + b.balance, 0)).toBeCloseTo(0)
    const tx = simplifyDebts(bal)
    expect(tx).toHaveLength(2)
    expect(tx.every((t) => t.to === 'a' && t.amount === 30)).toBe(true)
  })
  it('settlements reduce what is owed', () => {
    const expenses = [{ id: 1, paid_by: 'a', amount: 60 }]
    const splits = [{ expense_id: 1, user_id: 'b', amount: 60 }]
    const bal = computeBalances(expenses, splits, [{ from_user: 'b', to_user: 'a', amount: 60 }], members)
    expect(simplifyDebts(bal)).toEqual([])
  })
})

describe('safeNext', () => {
  it('allows same-site paths', () => {
    expect(safeNext('/groups/abc/add?x=1')).toBe('/groups/abc/add?x=1')
    expect(safeNext('/join/token123')).toBe('/join/token123')
  })
  it.each(['//evil.com', 'https://evil.com', '/\\evil.com', 'javascript:alert(1)', '', null, undefined])('rejects %s', (v) => {
    expect(safeNext(v)).toBe('/groups')
  })
})
