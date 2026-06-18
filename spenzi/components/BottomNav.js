'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav({ onProfileClick }) {
  const pathname = usePathname()

  const tabs = [
    {
      href: '/groups',
      label: 'Groups',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00D4AA' : '#5a7090'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: (active) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00D4AA' : '#5a7090'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111827]/90 backdrop-blur-lg border-t border-[#1e2a40] safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto" style={{ height: '64px' }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href === '/groups' && pathname.startsWith('/groups'))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 flex-1 py-2 min-h-[44px] justify-center"
            >
              {tab.icon(active)}
              <span className={`text-xs font-semibold ${active ? 'text-[#00D4AA]' : 'text-[#64748B]'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
