'use client'
import { useMemo, useState } from 'react'
import { RadioGroup, Radio, Label } from 'react-aria-components'
import { Grid2x2 } from 'lucide-react'
import { PICKER_CATEGORIES, getCategory } from '@/lib/categories'
import { Button } from './ui/Button'
import { Sheet } from './ui/Sheet'

const chip =
  'flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-line px-4 py-2.5 text-sm text-muted outline-none transition ' +
  'data-[hovered]:text-ivory data-[selected]:border-gold data-[selected]:bg-gold/15 data-[selected]:text-gold-soft data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft'

/** Recent categories as quick chips, plus a sheet with every category. */
export default function CategoryPicker({ value, onChange, recent = [] }) {
  const [open, setOpen] = useState(false)
  const quick = useMemo(() => {
    const ids = [...new Set([value, ...recent, 'groceries', 'eatingout', 'utilities', 'transport'])].filter((id) => id && !getCategory(id).legacy || id === value)
    return ids.slice(0, 5)
  }, [value, recent])

  return (
    <>
      <RadioGroup value={value} onChange={onChange} className="flex flex-col gap-2.5">
        <Label className="eyebrow">Category</Label>
        <div className="pan-x relative -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {quick.map((id) => {
            const { label, icon: Icon } = getCategory(id)
            return (
              <Radio key={id} value={id} className={chip}>
                <Icon aria-hidden size={16} strokeWidth={1.6} />
                {label}
              </Radio>
            )
          })}
          <Button variant="ghost" size="sm" className="h-auto shrink-0 px-4 py-2.5 text-sm text-muted" onPress={() => setOpen(true)}>
            <Grid2x2 aria-hidden size={16} strokeWidth={1.6} /> All
          </Button>
        </div>
      </RadioGroup>

      <Sheet isOpen={open} onOpenChange={setOpen} title="Choose category">
        {({ close }) => (
          <RadioGroup aria-label="Category" value={value} onChange={(v) => { onChange(v); close() }}>
            <div className="grid grid-cols-3 gap-2 pb-4">
              {PICKER_CATEGORIES.map(([id, { label, icon: Icon, color }]) => (
                <Radio
                  key={id}
                  value={id}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-line px-2 py-4 text-xs text-muted outline-none transition data-[selected]:border-gold data-[selected]:bg-gold/10 data-[selected]:text-gold-soft data-[hovered]:bg-white/5 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft"
                >
                  <Icon aria-hidden size={22} strokeWidth={1.5} style={{ color }} />
                  {label}
                </Radio>
              ))}
            </div>
          </RadioGroup>
        )}
      </Sheet>
    </>
  )
}
