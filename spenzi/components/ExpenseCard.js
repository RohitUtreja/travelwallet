'use client'
import { getCategoryEmoji, getCategoryColor, formatCurrency, formatDate } from '@/lib/utils'

export default function ExpenseCard({ expense, currency, currentUserId, onDelete }) {
  const emoji = getCategoryEmoji(expense.category)
  const color = getCategoryColor(expense.category)
  const paidByMe = expense.paid_by === currentUserId
  const paidByName = expense.profiles?.name ?? 'Unknown'

  return (
    <div className="bg-surface2 rounded-2xl p-4 border border-border flex items-center gap-3">
      {/* Category icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: color + '22' }}
      >
        {emoji}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-textprimary font-semibold text-sm truncate">
          {expense.description || expense.category}
        </p>
        <p className="text-muted text-xs mt-0.5">
          {paidByMe ? 'You paid' : `${paidByName} paid`} · {formatDate(expense.date)}
        </p>
        {expense.expense_splits && expense.expense_splits.length > 0 && (
          <p className="text-muted text-xs mt-0.5">
            Split {expense.expense_splits.length} {expense.expense_splits.length === 1 ? 'way' : 'ways'}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-textprimary font-bold text-base">
          {formatCurrency(expense.amount, currency)}
        </span>
        {paidByMe && onDelete && (
          <button
            onClick={() => onDelete(expense.id)}
            className="text-danger/70 text-xs hover:text-danger transition-colors"
            aria-label="Delete expense"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
