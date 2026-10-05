import { getCategory } from './categories'
import { budgetStatus, TOTAL_KEY } from './budgets'

const pct = (n) => Math.round(n * 100)

// Big, once-a-month items: extrapolating them day-by-day would wildly overstate the month.
export const LUMPY = new Set(['rent', 'insurance', 'investment'])
export const MIN_PROJECTION_DAY = 10

/**
 * Plain-language observations about a month of spend.
 * summary: result of group_spend_summary(); budgets: rows from `budgets`.
 * `today` is injectable for tests. Returns at most `max` insights, warnings first.
 */
export function buildInsights({ summary, budgets = [], year, month, today = new Date(), fmt = String, max = 4 }) {
  if (!summary || !Number(summary.count)) return []
  const out = []
  const total = Number(summary.total)
  const prevTotal = Number(summary.prev_total)
  const label = (id) => getCategory(id).label

  // Budgets
  for (const b of budgetStatus(budgets, summary.by_category, total)) {
    const name = b.category === TOTAL_KEY ? 'Overall budget' : `${label(b.category)} budget`
    if (b.state === 'over') {
      out.push({ id: `over-${b.category}`, tone: 'warn', priority: 0, text: `${name} exceeded by ${fmt(b.spent - b.limit)}` })
    } else if (b.state === 'near') {
      out.push({ id: `near-${b.category}`, tone: 'warn', priority: 1, text: `${name} is ${pct(b.pct)}% used` })
    }
  }

  // Month over month
  if (prevTotal > 0) {
    const d = (total - prevTotal) / prevTotal
    if (Math.abs(d) >= 0.1) {
      out.push({
        id: 'mom', tone: d > 0 ? 'warn' : 'good', priority: 2,
        text: `Spending is ${d > 0 ? 'up' : 'down'} ${pct(Math.abs(d))}% on last month`,
      })
    }
    // Biggest category mover (by absolute change, needs a meaningful base)
    const prev = Object.fromEntries((summary.prev_by_category ?? []).map((c) => [c.category, Number(c.total)]))
    let best = null
    for (const c of summary.by_category ?? []) {
      const before = prev[c.category] ?? 0
      const change = Number(c.total) - before
      if (before > 0 && Math.abs(change) / before >= 0.25 && (!best || Math.abs(change) > Math.abs(best.change))) {
        best = { id: c.category, change, ratio: change / before }
      }
    }
    if (best) {
      out.push({
        id: `mover-${best.id}`, tone: best.change > 0 ? 'warn' : 'good', priority: 3,
        text: `${label(best.id)} spending is ${best.change > 0 ? 'up' : 'down'} ${pct(Math.abs(best.ratio))}% on last month`,
      })
    }
  }

  // Run-rate projection: lumpy fixed items count as-is, everyday spend is extrapolated.
  const isCurrent = today.getFullYear() === year && today.getMonth() === month
  const day = today.getDate()
  if (isCurrent && day >= MIN_PROJECTION_DAY) {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const lumpy = (summary.by_category ?? []).filter((c) => LUMPY.has(c.category)).reduce((s, c) => s + Number(c.total), 0)
    const projected = lumpy + ((total - lumpy) / day) * daysInMonth
    const totalBudget = budgets.find((b) => b.category === TOTAL_KEY && Number(b.monthly_limit) > 0)
    if (totalBudget && projected > Number(totalBudget.monthly_limit) && total < Number(totalBudget.monthly_limit)) {
      out.push({ id: 'projection', tone: 'warn', priority: 1, text: `On pace for ${fmt(projected)} — over your ${fmt(Number(totalBudget.monthly_limit))} budget` })
    } else {
      out.push({ id: 'projection', tone: 'info', priority: 4, text: `On pace for ${fmt(projected)} this month` })
    }
  }

  const top = summary.top_expense
  if (top && Number(summary.count) > 2) {
    out.push({ id: 'top', tone: 'info', priority: 5, text: `Largest: ${fmt(Number(top.amount))} on ${top.description || label(top.category)}` })
  }

  return out.sort((a, b) => a.priority - b.priority).slice(0, max)
}
