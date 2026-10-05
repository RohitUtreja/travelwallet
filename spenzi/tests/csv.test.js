import { describe, it, expect } from 'vitest'
import { csvCell, toCSV } from '../lib/csv'

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('l1\nl2')).toBe('"l1\nl2"')
  })
  it('neutralises formula injection in text but not in numbers', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+1 cash')).toBe("'+1 cash")
    expect(csvCell(-45.5, { numeric: true })).toBe('-45.5')
  })
  it('builds rows with BOM and CRLF', () => {
    const out = toCSV([{ d: 'Rent', a: 100 }], [{ header: 'Desc', value: (r) => r.d }, { header: 'Amount', value: (r) => r.a, numeric: true }])
    expect(out).toBe('﻿Desc,Amount\r\nRent,100')
  })
  it('null/undefined become empty cells', () => expect(csvCell(null)).toBe(''))
})
