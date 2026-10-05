'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../ui/Button'
import { formatMonth, shiftMonth } from '@/lib/utils'

export default function MonthNav({ value, onChange }) {
  const now = new Date()
  const isCurrent = value.year === now.getFullYear() && value.month === now.getMonth()
  return (
    <div className="flex items-center justify-between" role="group" aria-label="Month">
      <IconButton label="Previous month" onPress={() => onChange(shiftMonth(value, -1))}><ChevronLeft size={18} /></IconButton>
      <span aria-live="polite" className="display text-2xl font-semibold">{formatMonth(value.year, value.month)}</span>
      <IconButton label="Next month" isDisabled={isCurrent} onPress={() => onChange(shiftMonth(value, 1))}><ChevronRight size={18} /></IconButton>
    </div>
  )
}
