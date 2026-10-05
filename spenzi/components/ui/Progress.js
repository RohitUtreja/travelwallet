'use client'
import { ProgressBar } from 'react-aria-components'
import { cx } from './cx'

/** Thin accessible progress bar. `value` 0–100 (clamped visually, real value announced). */
export function Progress({ value, label, color = '#c9a96a', className }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <ProgressBar value={v} aria-label={label} className={cx('w-full', className)}>
      {({ percentage }) => (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${percentage}%`, background: color }} />
        </div>
      )}
    </ProgressBar>
  )
}
