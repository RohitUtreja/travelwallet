import { describe, it, expect } from 'vitest'
import { createPinStore } from '../lib/pin'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), dump: () => [...m.values()].join() } }

describe('pin store', () => {
  it('is disabled until set; verifies correct and wrong pins', async () => {
    const s = createPinStore(memory())
    expect(s.isEnabled()).toBe(false)
    await s.set('1234')
    expect(s.isEnabled()).toBe(true)
    expect((await s.verify('1234')).ok).toBe(true)
    expect((await s.verify('9999')).ok).toBe(false)
  })
  it('never stores the PIN in the clear', async () => {
    const st = memory(); const s = createPinStore(st)
    await s.set('482916')
    expect(st.dump()).not.toContain('482916')
  })
  it('rejects malformed PINs', async () => {
    const s = createPinStore(memory())
    for (const bad of ['12', '1234567', 'abcd', '12 4']) await expect(s.set(bad)).rejects.toThrow()
  })
  it('throttles after 5 wrong tries, then recovers', async () => {
    let t = 1_000_000; const s = createPinStore(memory(), () => t)
    await s.set('1111')
    for (let i = 0; i < 4; i++) expect((await s.verify('0000')).waitMs).toBe(0)
    expect((await s.verify('0000')).waitMs).toBe(30000)          // 5th miss locks
    const locked = await s.verify('1111')                          // even the right PIN is refused
    expect(locked.ok).toBe(false); expect(locked.waitMs).toBeGreaterThan(0)
    t += 31000
    expect((await s.verify('1111')).ok).toBe(true)
  })
  it('remembers the PIN length so the UI verifies only once complete', async () => {
    const s = createPinStore(memory()); await s.set('482916')
    expect(s.length()).toBe(6)
  })
  it('clear() disables the lock', async () => {
    const s = createPinStore(memory()); await s.set('1234'); s.clear()
    expect(s.isEnabled()).toBe(false)
  })
})
