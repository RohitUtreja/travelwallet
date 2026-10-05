'use client'
import { Button as RACButton, Link as RACLink } from 'react-aria-components'
import { cx } from './cx'

const base =
  'inline-flex items-center justify-center gap-2 font-medium select-none outline-none transition ' +
  'data-[pressed]:scale-[0.97] data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed ' +
  'data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-shell'

const variants = {
  primary: 'rounded-full bg-gradient-to-b from-gold-soft to-gold text-ink shadow-gold data-[hovered]:brightness-105',
  ghost: 'rounded-full glass text-ivory data-[hovered]:bg-white/5',
  quiet: 'rounded-full text-muted data-[hovered]:text-ivory',
  danger: 'rounded-full border border-coral/40 bg-coral/10 text-coral data-[hovered]:bg-coral/15',
}
const sizes = { sm: 'h-9 px-4 text-sm', md: 'h-12 px-6 text-[15px]', lg: 'h-14 px-8 text-base w-full' }

export function Spinner({ className = '' }) {
  return <span aria-hidden className={cx('inline-block h-4 w-4 rounded-full border-2 border-current/30 border-t-current animate-spin', className)} />
}

export function Button({ variant = 'primary', size = 'md', className, children, isPending, ...props }) {
  return (
    <RACButton
      {...props}
      isPending={isPending}
      className={cx(base, variants[variant], sizes[size], className)}
    >
      {(rp) => (
        <>
          {rp.isPending && <Spinner />}
          {typeof children === 'function' ? children(rp) : children}
        </>
      )}
    </RACButton>
  )
}

/** Icon-only button. `label` is required for screen readers. */
export function IconButton({ label, children, className, variant = 'ghost', ...props }) {
  return (
    <RACButton
      {...props}
      aria-label={label}
      className={cx(base, 'h-11 w-11 rounded-full', variant === 'ghost' ? 'glass text-ivory' : 'text-muted', className)}
    >
      {children}
    </RACButton>
  )
}

export function LinkButton({ variant = 'primary', size = 'md', className, ...props }) {
  return <RACLink {...props} className={cx(base, variants[variant], sizes[size], 'cursor-pointer', className)} />
}
