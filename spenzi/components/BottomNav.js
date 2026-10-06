'use client'
import { usePathname } from 'next/navigation'
import { Link } from 'react-aria-components'
import { Wallet, Plus, UserRound } from 'lucide-react'

const item =
  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium tracking-wide outline-none transition ' +
  'data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft data-[focus-visible]:rounded-xl'

export default function BottomNav() {
  const path = usePathname()
  const tab = (href, label, Icon) => {
    const active = path === href || (href === '/groups' && path.startsWith('/groups'))
    return (
      <Link href={href} aria-current={active ? 'page' : undefined} className={`${item} ${active ? 'text-gold-soft' : 'text-faint data-[hovered]:text-ivory'}`}>
        <Icon aria-hidden size={21} strokeWidth={active ? 2 : 1.5} />
        {label}
      </Link>
    )
  }
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-shell">
      <div className="mx-auto flex h-[68px] max-w-lg items-center safe-bottom-nav box-content">
        {tab('/groups', 'Wallets', Wallet)}
        <Link
          href="/add"
          aria-label="Add expense"
          className="-mt-7 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-ink shadow-gold outline-none transition data-[pressed]:scale-95 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-shell"
        >
          <Plus size={26} strokeWidth={2} />
        </Link>
        {tab('/profile', 'Profile', UserRound)}
      </div>
    </nav>
  )
}
