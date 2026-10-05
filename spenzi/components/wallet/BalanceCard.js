'use client'
import { ArrowRight } from 'lucide-react'
import { LinkButton } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { formatCurrency } from '@/lib/utils'

export default function BalanceCard({ tx, currency, groupId, userId }) {
  const involved = tx.from === userId || tx.to === userId
  const params = new URLSearchParams({ from: tx.from, to: tx.to, amount: String(tx.amount) })
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={tx.fromName} size={38} />
          <span className="truncate text-[15px]">{tx.from === userId ? 'You' : tx.fromName}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="num text-[15px] font-semibold text-gold-soft">{formatCurrency(tx.amount, currency)}</span>
          <ArrowRight aria-hidden size={16} className="text-gold" />
        </div>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2.5">
          <Avatar name={tx.toName} size={38} />
          <span className="truncate text-[15px]">{tx.to === userId ? 'You' : tx.toName}</span>
        </div>
      </div>
      {involved && (
        <LinkButton href={`/groups/${groupId}/settle?${params}`} variant="ghost" size="sm">Settle up</LinkButton>
      )}
    </div>
  )
}
