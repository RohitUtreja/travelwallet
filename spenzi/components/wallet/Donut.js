import { getCategory } from '@/lib/categories'

/** Thin ring chart. The legend next to it carries the same data, so the SVG is decorative + summarised. */
export default function Donut({ slices, total, size = 132, label }) {
  const r = 52
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 132 132" className="shrink-0 -rotate-90">
      <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
      {total > 0 && slices.map((s) => {
        const len = (Number(s.total) / total) * c
        const el = (
          <circle
            key={s.category} cx="66" cy="66" r={r} fill="none" stroke={getCategory(s.category).color} strokeWidth="9"
            strokeDasharray={`${Math.max(len - 2, 0)} ${c - Math.max(len - 2, 0)}`} strokeDashoffset={-offset} strokeLinecap="round"
          />
        )
        offset += len
        return el
      })}
    </svg>
  )
}
