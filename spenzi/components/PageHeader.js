'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { IconButton } from './ui/Button'

/** Sticky header. Pass `back` for a back button; `children` renders on the right. */
export default function PageHeader({ title, eyebrow, back, children, sticky = true }) {
  const router = useRouter()
  return (
    <header className={`${sticky ? 'sticky top-0 z-30' : ''} flex items-center gap-3 border-b border-line bg-shell/90 px-5 pb-4 backdrop-blur-xl safe-top`}>
      {back && (
        <IconButton label="Back" onPress={() => (typeof back === 'string' ? router.push(back) : router.back())}>
          <ChevronLeft size={20} />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display truncate text-[28px] font-semibold leading-tight">{title}</h1>
      </div>
      {children}
    </header>
  )
}
