import { describe, it, expect } from 'vitest'
import { createQueue, isNetworkError } from '../lib/offlineQueue'

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) } }

describe('offline queue', () => {
  it('flushes in order and empties', async () => {
    const q = createQueue(memory()); const seen = []
    q.enqueue({ id: 'a' }); q.enqueue({ id: 'b' })
    const r = await q.flush(async (j) => { seen.push(j.id) })
    expect(seen).toEqual(['a', 'b']); expect(r).toMatchObject({ done: 2, remaining: 0 })
  })
  it('stops on a network error and keeps the rest', async () => {
    const q = createQueue(memory())
    q.enqueue({ id: 'a' }); q.enqueue({ id: 'b' })
    const r = await q.flush(async () => ({ error: new Error('Failed to fetch') }))
    expect(r).toMatchObject({ done: 0, remaining: 2 })
  })
  it('drops permanently-failing jobs without blocking the rest', async () => {
    const q = createQueue(memory())
    q.enqueue({ id: 'bad' }); q.enqueue({ id: 'good' })
    const r = await q.flush(async (j) => (j.id === 'bad' ? { error: new Error('violates row-level security') } : undefined))
    expect(r.done).toBe(1); expect(r.failed[0].message).toMatch(/row-level/); expect(r.remaining).toBe(0)
  })
  it('re-enqueueing the same id replaces rather than duplicates', () => {
    const q = createQueue(memory())
    q.enqueue({ id: 'a', v: 1 }); q.enqueue({ id: 'a', v: 2 })
    expect(q.list()).toEqual([{ id: 'a', v: 2 }])
  })
  it('classifies network errors', () => {
    expect(isNetworkError(new Error('TypeError: Failed to fetch'))).toBe(true)
    expect(isNetworkError(new Error('new row violates row-level security'))).toBe(false)
    expect(isNetworkError(new Error('Request timed out'))).toBe(true)
    expect(isNetworkError(Object.assign(new Error('x'), { retry: true }))).toBe(true)
    expect(isNetworkError(null)).toBe(false)
  })
})
