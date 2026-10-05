'use client'
import { Tabs as RACTabs, TabList as RACTabList, Tab as RACTab, TabPanel as RACTabPanel } from 'react-aria-components'
import { cx } from './cx'

export const Tabs = RACTabs

export function TabList({ className, ...props }) {
  return <RACTabList {...props} className={cx('flex border-b border-line', className)} />
}

export function Tab({ className, ...props }) {
  return (
    <RACTab
      {...props}
      className={cx(
        'relative flex-1 cursor-pointer py-3.5 text-center text-[13px] font-medium tracking-wide text-faint outline-none transition',
        'data-[selected]:text-gold-soft data-[hovered]:text-ivory data-[focus-visible]:ring-2 data-[focus-visible]:ring-inset data-[focus-visible]:ring-gold-soft',
        "data-[selected]:after:absolute data-[selected]:after:inset-x-[22%] data-[selected]:after:bottom-0 data-[selected]:after:h-0.5 data-[selected]:after:rounded-full data-[selected]:after:bg-gold",
        className
      )}
    />
  )
}

export function TabPanel({ className, ...props }) {
  return <RACTabPanel {...props} className={cx('outline-none', className)} />
}
