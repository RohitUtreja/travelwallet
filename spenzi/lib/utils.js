// ─── Currency formatting ─────────────────────────────────────────────────────

export function formatCurrency(amount, currencyCode) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currencyCode} ${Number(amount).toFixed(2)}`
  }
}

export function parseAmount(str) {
  // Handle both comma and dot as decimal separator
  const cleaned = String(str).replace(/[^\d.,]/g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : Math.round(val * 100) / 100
}

// ─── Category definitions ────────────────────────────────────────────────────

export const CATEGORIES = {
  // Home / personal
  rent:          { emoji: '🏠', label: 'Rent',        color: '#A78BFA' },
  groceries:     { emoji: '🛒', label: 'Groceries',   color: '#34D399' },
  eatingout:     { emoji: '🍴', label: 'Eating Out',  color: '#FF6B6B' },
  utilities:     { emoji: '⚡', label: 'Utilities',   color: '#FBBF24' },
  fitness:       { emoji: '💪', label: 'Fitness',     color: '#10b981' },
  insurance:     { emoji: '🛡️', label: 'Insurance',   color: '#60A5FA' },
  investment:    { emoji: '📈', label: 'Investment',  color: '#ccff00' },
  entertainment: { emoji: '🎬', label: 'Entertain',   color: '#F472B6' },
  // Travel / group
  transport:     { emoji: '🚌', label: 'Transport',   color: '#4A90E2' },
  car:           { emoji: '🚗', label: 'Car',         color: '#7B68EE' },
  taxi:          { emoji: '🚕', label: 'Taxi',        color: '#F5A623' },
  hotel:         { emoji: '🏨', label: 'Hotel',       color: '#50E3C2' },
  flights:       { emoji: '✈️', label: 'Flights',     color: '#00D4AA' },
  activities:    { emoji: '🎡', label: 'Activities',  color: '#FF9F43' },
  shopping:      { emoji: '🛍️', label: 'Shopping',    color: '#EE5A24' },
  fuel:          { emoji: '⛽', label: 'Fuel',        color: '#C0392B' },
  medical:       { emoji: '💊', label: 'Medical',     color: '#A29BFE' },
  other:         { emoji: '💰', label: 'Other',       color: '#5a7090' },
}

export function getCategoryEmoji(category) {
  return CATEGORIES[category]?.emoji ?? '💰'
}

export function getCategoryColor(category) {
  return CATEGORIES[category]?.color ?? '#5a7090'
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

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function todayISO() {
  return new Date().toISOString().split('T')[0]
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function getInitial(name) {
  return name ? name.charAt(0).toUpperCase() : '?'
}

export function avatarBg(name) {
  const colors = ['#00D4AA', '#4A90E2', '#FF6B6B', '#FFB547', '#A29BFE', '#50E3C2', '#FF9F43']
  let hash = 0
  for (let i = 0; i < (name?.length ?? 0); i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}
