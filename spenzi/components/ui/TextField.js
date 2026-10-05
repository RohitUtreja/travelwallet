'use client'
import { TextField as RACTextField, Label, Input, TextArea, Text, FieldError } from 'react-aria-components'
import { cx } from './cx'

const field =
  'w-full rounded-2xl border border-line bg-white/[0.04] px-4 text-[15px] text-ivory placeholder:text-faint outline-none transition ' +
  'data-[focused]:border-gold/70 data-[focused]:ring-4 data-[focused]:ring-gold/10 data-[invalid]:border-coral/70'

export function TextField({ label, description, className, inputClassName, multiline, ...props }) {
  return (
    <RACTextField {...props} className={cx('flex flex-col gap-2', className)}>
      {label && <Label className="eyebrow">{label}</Label>}
      {multiline ? (
        <TextArea className={cx(field, 'py-3 min-h-24', inputClassName)} />
      ) : (
        <Input className={cx(field, 'h-12', inputClassName)} />
      )}
      {description && <Text slot="description" className="text-xs text-faint">{description}</Text>}
      <FieldError className="text-xs text-coral" />
    </RACTextField>
  )
}
