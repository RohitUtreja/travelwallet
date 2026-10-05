'use client'
import { Switch as RACSwitch } from 'react-aria-components'
import { cx } from './cx'

export function Switch({ children, className, ...props }) {
  return (
    <RACSwitch {...props} className={cx('group flex cursor-pointer items-center justify-between gap-3 outline-none', className)}>
      <span className="text-[15px] text-ivory">{children}</span>
      <span className="relative h-7 w-12 shrink-0 rounded-full border border-line bg-white/10 transition group-data-[selected]:border-gold group-data-[selected]:bg-gold group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-gold-soft">
        <span className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-ivory shadow transition group-data-[selected]:translate-x-5 group-data-[selected]:bg-ink" />
      </span>
    </RACSwitch>
  )
}
