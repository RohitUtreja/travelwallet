'use client'
import { formatCurrency, avatarBg, getInitial } from '@/lib/utils'
import Link from 'next/link'

export default function BalanceCard({ transaction, currency, groupId, currentUserId }) {
  const isMyDebt = transaction.from === currentUserId
  const isMyCredit = transaction.to === currentUserId

  return (
    <div className="card w-full">
      <div className="flex items-center gap-3">
        {/* From avatar */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: avatarBg(transaction.fromName), color: '#000' }}
          >
            {getInitial(transaction.fromName)}
          </div>
          <span className="mono text-[9px] max-w-[48px] truncate text-center" style={{ color: 'rgba(235,235,235,0.3)' }}>
            {isMyDebt ? 'You' : transaction.fromName}
          </span>
        </div>

        {/* Arrow + amount */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <p
            className="mono text-sm font-semibold"
            style={{ color: isMyDebt ? '#ff4d4d' : isMyCredit ? '#10b981' : '#ebebeb' }}
          >
            {formatCurrency(transaction.amount, currency)}
          </p>
          <div className="flex items-center gap-1 w-full justify-center">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccff00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <span className="mono text-[9px]" style={{ color: 'rgba(235,235,235,0.3)' }}>owes</span>
        </div>

        {/* To avatar */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: avatarBg(transaction.toName), color: '#000' }}
          >
            {getInitial(transaction.toName)}
          </div>
          <span className="mono text-[9px] max-w-[48px] truncate text-center" style={{ color: 'rgba(235,235,235,0.3)' }}>
            {isMyCredit ? 'You' : transaction.toName}
          </span>
        </div>
      </div>

      {/* Settle button — only for involved parties */}
      {(isMyDebt || isMyCredit) && (
        <Link
          href={`/groups/${groupId}/settle?from=${transaction.from}&to=${transaction.to}&amount=${transaction.amount}`}
          className="mt-3 w-full flex items-center justify-center py-2.5 rounded-full text-xs font-bold border transition-all active:scale-95 min-h-[44px] mono"
          style={{ border: '1px solid rgba(204,255,0,0.3)', color: '#ccff00', letterSpacing: '0.1em' }}
        >
          SETTLE UP
        </Link>
      )}
    </div>
  )
}
