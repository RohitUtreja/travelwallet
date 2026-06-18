'use client'
import { formatCurrency, avatarBg, getInitial } from '@/lib/utils'
import Link from 'next/link'

export default function BalanceCard({ transaction, currency, groupId, currentUserId }) {
  const isMyDebt = transaction.from === currentUserId
  const isMyCredit = transaction.to === currentUserId

  return (
    <div className="bg-[#111827] rounded-2xl p-4 border border-[#1e2a40] w-full">
      <div className="flex items-center gap-3">
        {/* From avatar */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2 border-[#0A0E1A]"
            style={{ backgroundColor: avatarBg(transaction.fromName) }}
          >
            {getInitial(transaction.fromName)}
          </div>
          <span className="text-[10px] text-[#64748B] font-medium max-w-[48px] truncate text-center">
            {isMyDebt ? 'You' : transaction.fromName}
          </span>
        </div>

        {/* Arrow + amount */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <p className={`amount-display text-base ${isMyDebt ? 'text-[#FF6B6B]' : isMyCredit ? 'text-[#00D4AA]' : 'text-[#F1F5F9]'}`}>
            {formatCurrency(transaction.amount, currency)}
          </p>
          <div className="flex items-center gap-1 w-full justify-center">
            <div className="h-px flex-1 bg-[#1e2a40]" />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D4AA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
            <div className="h-px flex-1 bg-[#1e2a40]" />
          </div>
          <span className="text-[10px] text-[#64748B]">owes</span>
        </div>

        {/* To avatar */}
        <div className="flex flex-col items-center gap-1">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2 border-[#0A0E1A]"
            style={{ backgroundColor: avatarBg(transaction.toName) }}
          >
            {getInitial(transaction.toName)}
          </div>
          <span className="text-[10px] text-[#64748B] font-medium max-w-[48px] truncate text-center">
            {isMyCredit ? 'You' : transaction.toName}
          </span>
        </div>
      </div>

      {/* Settle button — only show if current user is involved */}
      {(isMyDebt || isMyCredit) && (
        <Link
          href={`/groups/${groupId}/settle?from=${transaction.from}&to=${transaction.to}&amount=${transaction.amount}`}
          className="mt-3 w-full flex items-center justify-center py-2 rounded-full text-sm font-semibold border border-[#00D4AA]/30 text-[#00D4AA] hover:bg-[#00D4AA]/10 transition-colors min-h-[44px]"
        >
          Settle up
        </Link>
      )}
    </div>
  )
}
