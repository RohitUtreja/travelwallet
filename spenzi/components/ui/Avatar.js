import { getInitial, avatarBg } from '@/lib/utils'
import { cx } from './cx'

// Colours stored by earlier themes (teal/lime) clash with the gold palette: fall back to the name-based tone.
const LEGACY = new Set(['#00d4aa', '#ccff00'])

export function Avatar({ name, color, size = 36, className, ring }) {
  return (
    <span
      aria-hidden
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink', ring && 'ring-2 ring-shell', className)}
      style={{ width: size, height: size, fontSize: size * 0.4, background: color && !LEGACY.has(color.toLowerCase()) ? color : avatarBg(name ?? '') }}
    >
      {getInitial(name)}
    </span>
  )
}
