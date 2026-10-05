'use client'
import { useEffect, useState } from 'react'
import { Link } from 'react-aria-components'
import { Wallet, House, Users, ChevronRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { guessCurrency } from '@/lib/currencies'
import { useSession } from '@/lib/useSession'
import BottomNav from '@/components/BottomNav'
import PageHeader from '@/components/PageHeader'
import { ListSkeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'

const TYPE = {
  personal: { label: 'Personal', Icon: Wallet },
  family: { label: 'Family', Icon: House },
  split: { label: 'Split', Icon: Users },
}

function Balance({ w }) {
  if (w.type !== 'split') return null
  const b = Number(w.balance)
  if (Math.abs(b) < 0.01) return <span className="text-xs text-faint">Settled up</span>
  return (
    <span className={`text-xs font-medium ${b > 0 ? 'text-sage' : 'text-coral'}`}>
      {b > 0 ? 'You’re owed ' : 'You owe '}
      <span className="num">{formatCurrency(Math.abs(b), w.currency)}</span>
    </span>
  )
}

export default function WalletsPage() {
  const { user } = useSession()
  const { show } = useToast()
  const [wallets, setWallets] = useState(null)

  useEffect(() => {
    if (!user) return
    ;(async () => {
      const supabase = createClient()
      await supabase.rpc('ensure_personal_wallet', { p_currency: guessCurrency() }) // idempotent; also folds in legacy Tracker data
      const { data, error } = await supabase.rpc('wallet_overview')
      if (error) { show(error.message, { type: 'error' }); setWallets([]); return }
      setWallets(data ?? [])
    })()
  }, [user, show])

  return (
    <div className="page pb-32">
      <PageHeader eyebrow="FamilyWallet" title="Your wallets">
        <Link href="/groups/new" aria-label="New wallet" className="glass flex h-11 w-11 items-center justify-center rounded-full text-ivory outline-none data-[hovered]:bg-white/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft">
          <Plus size={20} />
        </Link>
      </PageHeader>

      <main className="flex flex-col gap-3 px-5 py-6">
        {wallets === null ? (
          <ListSkeleton rows={3} className="h-24" />
        ) : (
          <>
            {wallets.map((w, i) => {
              const { Icon, label } = TYPE[w.type] ?? TYPE.split
              return (
                <Link
                  key={w.id}
                  href={`/groups/${w.id}`}
                  className="card group flex animate-rise items-center gap-4 p-5 outline-none transition data-[hovered]:border-gold/40 data-[pressed]:scale-[0.99] data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10 text-gold-soft">
                    <Icon aria-hidden size={22} strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="display truncate text-xl font-semibold">{w.name}</span>
                      {w.role !== 'admin' && <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-faint">{w.role}</span>}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {label}{w.type !== 'personal' && ` · ${w.member_count} ${w.member_count == 1 ? 'member' : 'members'}`}
                    </span>
                    <span className="mt-2 flex items-baseline justify-between gap-3">
                      <span className="num text-sm text-ivory">
                        {formatCurrency(w.month_total, w.currency)}
                        <span className="ml-1.5 text-xs text-faint">this month</span>
                      </span>
                      <Balance w={w} />
                    </span>
                  </span>
                  <ChevronRight aria-hidden size={18} className="shrink-0 text-faint" />
                </Link>
              )
            })}

            <Link
              href="/groups/new"
              className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-gold/30 p-5 text-sm text-gold-soft outline-none transition data-[hovered]:bg-gold/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft"
            >
              <Plus size={16} /> New family or split wallet
            </Link>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
