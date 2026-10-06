'use client'
import { usePathname } from 'next/navigation'
import { Link } from 'react-aria-components'
import { Wallet, Plus, UserRound } from 'lucide-react'

const tabBase =
  'flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium tracking-wide outline-none transition ' +
  'data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft'

/**
 * Floating "island" tab bar: a rounded glass pill that hovers above the bottom edge (and above the
 * home indicator). Plain fixed positioning: it follows Safari's toolbar and the installed app's real
 * bottom edge. The wrapper ignores touches so only the pill is interactive.
 */
export default function BottomNav() {
  const path = usePathname()
  const tab = (href, label, Icon) => {
    const active = path === href || (href === '/groups' && path.startsWith('/groups'))
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`${tabBase} ${active ? 'bg-gold/10 text-gold-soft' : 'text-faint data-[hovered]:text-ivory'}`}
      >
        <Icon aria-hidden size={20} strokeWidth={active ? 2 : 1.5} />
        {label}
      </Link>
    )
  }
  return (
    <nav aria-label="Main" className="safe-bottom-island pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4">
      <div className="pointer-events-auto mx-auto flex h-16 max-w-sm items-center gap-1 rounded-full border border-gold/25 bg-raised/95 px-2 shadow-lift backdrop-blur-xl">
        {tab('/groups', 'Wallets', Wallet)}
        <Link
          href="/add"
          aria-label="Add expense"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-gold-soft to-gold text-ink shadow-gold outline-none transition data-[pressed]:scale-95 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-raised"
        >
          <Plus size={24} strokeWidth={2} />
        </Link>
        {tab('/profile', 'Profile', UserRound)}
      </div>
    </nav>
  )
}
