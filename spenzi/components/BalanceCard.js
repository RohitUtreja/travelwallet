'use client'
import { formatCurrency, avatarBg, getInitial } from '@/lib/utils'
import Link from 'next/link'

export default function BalanceCard({ transaction, currency, groupId, currentUserId }) {
  const isMyDebt = transaction.from === currentUserId
  const isMyCredit = transaction.to === currentUserId

  return (
    <div className="bg-surface2 rounded-2xl p-4 border border-border">
      <div className="flex items-center gap-3">
        {/* From avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: avatarBg(transaction.fromName) }}
        >
          {getInitial(transaction.fromName)}
        </div>

        {/* Arrow + details */}
        <div className="flex-1 min-w-0">
          <p className="text-textprimary text-sm">
            <span className={`font-semibold ${isMyDebt ? 'text-danger' : 'text-textprimary'}`}>
              {isMyDebt ? 'You' : transaction.fromName}
            </span>
            <span className="text-muted"> owe </span>
            <span className={`font-semibold ${isMyCredit ? 'text-accent' : 'text-textprimary'}`}>
              {isMyCredit ? 'you' : transaction.toName}
            </span>
          </p>
          <p className={`text-base font-bold mt-0.5 ${isMyDebt ? 'text-danger' : isMyCredit ? 'text-accent' : 'text-textprimary'}`}>
            {formatCurrency(transaction.amount, currency)}
          </p>
        </div>

        {/* To avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: avatarBg(transaction.toName) }}
        >
          {getInitial(transaction.toName)}
        </div>
      </div>

      {/* Settle button — only show if current user is involved */}
      {(isMyDebt || isMyCredit) && (
        <Link
          href={`/groups/${groupId}/settle?from=${transaction.from}&to=${transaction.to}&amount=${transaction.amount}`}
          className="mt-3 w-full flex items-center justify-center py-2 rounded-xl text-sm font-semibold border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
        >
          Settle up
        </Link>
      )}
    </div>
  )
}
