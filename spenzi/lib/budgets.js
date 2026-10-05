export const TOTAL_KEY = '_total'

/**
 * Compare spend with budgets.
 * budgets: [{category, monthly_limit}], byCategory: [{category,total}], total: number
 * state: 'ok' (<80%) | 'near' (>=80%) | 'over' (>=100%)
 */
export function budgetStatus(budgets, byCategory, total) {
  const spent = Object.fromEntries((byCategory ?? []).map((c) => [c.category, Number(c.total)]))
  return (budgets ?? [])
    .map((b) => {
      const limit = Number(b.monthly_limit)
      const used = b.category === TOTAL_KEY ? Number(total) || 0 : spent[b.category] ?? 0
      const pct = limit > 0 ? used / limit : used > 0 ? Infinity : 0
      return {
        category: b.category,
        limit,
        spent: used,
        pct,
        state: limit > 0 && pct >= 1 ? 'over' : limit > 0 && pct >= 0.8 ? 'near' : 'ok',
      }
    })
    .filter((b) => b.limit > 0)
    .sort((a, b) => (a.category === TOTAL_KEY ? -1 : b.category === TOTAL_KEY ? 1 : b.pct - a.pct))
}
