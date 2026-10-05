'use client'
import { Select as RACSelect, Label, Button, SelectValue, Popover, ListBox, ListBoxItem } from 'react-aria-components'
import { ChevronDown, Check } from 'lucide-react'
import { cx } from './cx'

/** items: [{ id, label }] */
export function Select({ label, items, className, placeholder = 'Select…', compact, ...props }) {
  return (
    <RACSelect {...props} placeholder={placeholder} className={cx('flex flex-col gap-2', className)}>
      {label && <Label className="eyebrow">{label}</Label>}
      <Button
        className={cx(
          'flex w-full items-center justify-between gap-2 rounded-2xl border border-line bg-white/[0.04] text-left text-[15px] text-ivory outline-none transition',
          'data-[focus-visible]:border-gold/70 data-[focus-visible]:ring-4 data-[focus-visible]:ring-gold/10 data-[pressed]:bg-white/10',
          compact ? 'h-10 gap-1 px-3 text-sm' : 'h-12 px-4'
        )}
      >
        <SelectValue className="truncate data-[placeholder]:text-faint" />
        <ChevronDown aria-hidden size={16} className="shrink-0 text-muted" />
      </Button>
      <Popover className="glass z-[70] max-h-72 overflow-auto rounded-2xl bg-raised p-1 shadow-lift data-[entering]:animate-rise" style={{ width: 'var(--trigger-width)', background: '#1a1713' }}>
        <ListBox items={items} className="outline-none">
          {(item) => (
            <ListBoxItem
              id={item.id}
              textValue={item.label}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm text-ivory outline-none data-[focused]:bg-white/10 data-[selected]:text-gold-soft"
            >
              {({ isSelected }) => (
                <>
                  <span className="truncate">{item.label}</span>
                  {isSelected && <Check aria-hidden size={14} />}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </RACSelect>
  )
}
