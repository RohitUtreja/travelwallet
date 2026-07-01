'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav({ onProfileClick }) {
  const pathname = usePathname()

  const tabs = [
    {
      href: '/groups',
      label: 'GROUPS',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ccff00' : 'rgba(235,235,235,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      href: '/tracker',
      label: 'TRACKER',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ccff00' : 'rgba(235,235,235,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
          <path d="M7 10l3 3 3-3 3 3"/>
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'PROFILE',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#ccff00' : 'rgba(235,235,235,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t safe-area-bottom"
      style={{
        background: 'rgba(12,12,12,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-around max-w-[430px] mx-auto" style={{ height: '68px' }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href === '/groups' && pathname.startsWith('/groups')) || (tab.href === '/tracker' && pathname.startsWith('/tracker'))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 flex-1 py-2 min-h-[44px] justify-center"
            >
              {tab.icon(active)}
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.1em',
                  color: active ? '#ccff00' : 'rgba(235,235,235,0.3)',
                }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
