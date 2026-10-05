import { getCategory } from '@/lib/categories'

export function CategoryIcon({ id, size = 44 }) {
  const { icon: Icon, color } = getCategory(id)
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-2xl"
      style={{ width: size, height: size, background: `${color}1f`, border: `1px solid ${color}38`, color }}
    >
      <Icon size={size * 0.44} strokeWidth={1.6} />
    </span>
  )
}
