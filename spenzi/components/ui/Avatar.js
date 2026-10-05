import { getInitial, avatarBg } from '@/lib/utils'
import { cx } from './cx'

export function Avatar({ name, color, size = 36, className, ring }) {
  return (
    <span
      aria-hidden
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink', ring && 'ring-2 ring-shell', className)}
      style={{ width: size, height: size, fontSize: size * 0.4, background: color || avatarBg(name ?? '') }}
    >
      {getInitial(name)}
    </span>
  )
}
