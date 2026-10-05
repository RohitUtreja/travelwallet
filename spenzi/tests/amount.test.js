import { describe, it, expect } from 'vitest'
import { nextAmount, displayAmount, toEditable } from '../lib/amount'

const type = (...keys) => keys.reduce(nextAmount, '')

describe('nextAmount', () => {
  it('types digits and decimals', () => expect(type('4', '5', '0', 'dot', '5')).toBe('450.5'))
  it('prefixes 0 when starting with a dot', () => expect(type('dot', '5')).toBe('0.5'))
  it('ignores a second dot', () => expect(type('1', 'dot', '2', 'dot', '3')).toBe('1.23'))
  it('limits to 2 decimals', () => expect(type('1', 'dot', '2', '3', '4')).toBe('1.23'))
  it('avoids leading zeros', () => { expect(type('0', '0', '7')).toBe('7'); expect(type('0', 'dot', '0', '5')).toBe('0.05') })
  it('caps the integer part at 9 digits', () => expect(type(...'1234567890123'.split(''))).toBe('123456789'))
  it('backspace removes the last char, including the dot', () => {
    expect(nextAmount('12.5', 'back')).toBe('12.')
    expect(nextAmount('12.', 'back')).toBe('12')
    expect(nextAmount('', 'back')).toBe('')
  })
  it('ignores unknown keys', () => expect(nextAmount('5', 'x')).toBe('5'))
})

describe('displayAmount / toEditable', () => {
  it('groups thousands and preserves typing state', () => {
    expect(displayAmount('', 'en-US')).toBe('0')
    expect(displayAmount('1234567', 'en-US')).toBe('1,234,567')
    expect(displayAmount('1234.', 'en-US')).toBe('1,234.')
    expect(displayAmount('1234.5', 'en-US')).toBe('1,234.5')
  })
  it('toEditable trims zeros', () => { expect(toEditable(450.5)).toBe('450.5'); expect(toEditable('12.00')).toBe('12'); expect(toEditable(0)).toBe('') })
})
