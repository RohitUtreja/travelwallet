'use client'
import { Button } from 'react-aria-components'
import { Delete } from 'lucide-react'

const KEY =
  'flex h-14 items-center justify-center rounded-2xl text-2xl text-ivory outline-none transition num ' +
  'data-[hovered]:bg-white/[0.06] data-[pressed]:bg-white/10 data-[pressed]:scale-95 data-[focus-visible]:ring-2 data-[focus-visible]:ring-gold-soft'

/** 3×4 numeric pad. onKey receives '0'–'9', 'dot' or 'back'. Pass decimal={false} for PINs. */
export default function Keypad({ onKey, decimal = true, className = '' }) {
  return (
    <div role="group" aria-label="Number pad" className={`grid grid-cols-3 gap-1 ${className}`}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
        <Button key={k} className={KEY} onPress={() => onKey(k)}>{k}</Button>
      ))}
      {decimal ? (
        <Button className={KEY} aria-label="Decimal point" onPress={() => onKey('dot')}>.</Button>
      ) : <span aria-hidden />}
      <Button className={KEY} onPress={() => onKey('0')}>0</Button>
      <Button className={KEY} aria-label="Delete" onPress={() => onKey('back')}><Delete size={22} strokeWidth={1.5} /></Button>
    </div>
  )
}
