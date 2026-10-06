// ─── Currency ────────────────────────────────────────────────────────────────

export function formatCurrency(amount, currencyCode, { compact = false } = {}) {
  const n = Number(amount) || 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: compact ? 1 : 2,
    }).format(n)
  } catch {
    return `${currencyCode} ${n.toFixed(2)}`
  }
}

/**
 * Parse a user-typed amount. Handles "1,234.50", "1.234,50", "35,24" (decimal comma)
 * and "1,234" (thousands). Returns 0 for unparseable input.
 */
export function parseAmount(input) {
  let s = String(input ?? '').replace(/[^\d.,]/g, '')
  if (!s) return 0
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma !== -1 && lastDot !== -1) {
    // whichever comes last is the decimal separator
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma !== -1) {
    const parts = s.split(',')
    s = parts.length === 2 && parts[1].length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '')
  } else if ((s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, '') // "1.234.567" => thousands dots
  }
  const val = parseFloat(s)
  return Number.isFinite(val) ? Math.round(val * 100) / 100 : 0
}

// ─── Debt simplification (minimize cash flow) ────────────────────────────────

/**
 * Given an array of { userId, name, balance } objects (balance > 0 means owed money,
 * balance < 0 means owes money), returns an array of { from, fromName, to, toName, amount }
 * that minimizes the number of transactions needed to settle all debts.
 */
export function simplifyDebts(balances) {
  // Filter out zero balances and work with cents to avoid floating point issues
  const people = balances
    .map((b) => ({ ...b, balance: Math.round(b.balance * 100) }))
    .filter((b) => b.balance !== 0)

  const creditors = people.filter((p) => p.balance > 0).sort((a, b) => b.balance - a.balance)
  const debtors = people.filter((p) => p.balance < 0).sort((a, b) => a.balance - b.balance)

  const transactions = []
  let i = 0
  let j = 0

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]
    const debtor = debtors[j]
    const amount = Math.min(creditor.balance, -debtor.balance)

    if (amount > 0) {
      transactions.push({
        from: debtor.userId,
        fromName: debtor.name,
        to: creditor.userId,
        toName: creditor.name,
        amount: amount / 100,
      })
    }

    creditor.balance -= amount
    debtor.balance += amount

    if (creditor.balance === 0) i++
    if (debtor.balance === 0) j++
  }

  return transactions
}

/**
 * Compute per-member net balances from expenses + splits + settlements within a group.
 * expenses: array of { id, paid_by, amount }
 * splits: array of { expense_id, user_id, amount }
 * settlements: array of { from_user, to_user, amount }
 * members: array of { user_id, profiles: { name } }
 * Returns array of { userId, name, balance }
 */
export function computeBalances(expenses, splits, settlements, members) {
  const balanceMap = {}

  // Initialize all members at 0
  for (const m of members) {
    balanceMap[m.user_id] = { userId: m.user_id, name: m.profiles?.name ?? 'Unknown', balance: 0 }
  }

  // For each expense: the payer gains credit = amount paid
  for (const expense of expenses) {
    if (balanceMap[expense.paid_by]) {
      balanceMap[expense.paid_by].balance += Number(expense.amount)
    }
  }

  // For each split: the split recipient owes their share → subtract from balance
  for (const split of splits) {
    if (balanceMap[split.user_id]) {
      balanceMap[split.user_id].balance -= Number(split.amount)
    }
  }

  // Apply settlements: from_user paid to_user, so from_user balance goes up, to_user goes down
  for (const s of settlements) {
    if (balanceMap[s.from_user]) balanceMap[s.from_user].balance += Number(s.amount)
    if (balanceMap[s.to_user]) balanceMap[s.to_user].balance -= Number(s.amount)
  }

  return Object.values(balanceMap)
}

// ─── Dates (local time — never UTC, or late-night entries land on the wrong day) ──

const pad = (n) => String(n).padStart(2, '0')

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function monthRange(year, month) {
  const last = new Date(year, month + 1, 0).getDate()
  return { from: `${year}-${pad(month + 1)}-01`, to: `${year}-${pad(month + 1)}-${pad(last)}` }
}

export function shiftMonth({ year, month }, delta) {
  const n = year * 12 + month + delta
  return { year: Math.floor(n / 12), month: ((n % 12) + 12) % 12 }
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatMonth(year, month, style = 'long') {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: style, year: 'numeric' })
}

// ─── People ──────────────────────────────────────────────────────────────────

export function getInitial(name) {
  return name ? name.trim().charAt(0).toUpperCase() : '?'
}

export const AVATAR_COLORS = ['#c9a96a', '#86bf9f', '#9bb5d6', '#e58b7f', '#b9a3d9', '#d9b38c', '#8fc9c4', '#d6a0b5']

export function avatarBg(name) {
  let hash = 0
  for (let i = 0; i < (name?.length ?? 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Navigation ──────────────────────────────────────────────────────────────

/** Only same-site relative paths — blocks open redirects like //evil.com or /\\evil.com. */
export function safeNext(next) {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/groups'
}

// ─── Layout ──────────────────────────────────────────────────────────────────

/**
 * Largest font size (<= max) at which `text` fits in `available` px. Digits in the display
 * serif are ~0.56em wide; used for big money figures so 9-digit amounts never overflow.
 */
export function fitFontSize(text, max, available, min = 24) {
  const len = Math.max(String(text ?? '').length, 1)
  return Math.max(min, Math.min(max, Math.floor(available / (len * 0.56))))
}
