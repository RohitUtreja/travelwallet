import { cx } from './cx'

export function Skeleton({ className }) {
  return <div aria-hidden className={cx('relative overflow-hidden rounded-2xl bg-white/[0.05] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.06] before:to-transparent', className)} />
}

export function ListSkeleton({ rows = 4, className = 'h-[72px]' }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={className} />)}
    </div>
  )
}
