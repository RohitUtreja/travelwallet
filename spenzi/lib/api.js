import { createClient } from './supabase'
import { createQueue, isNetworkError } from './offlineQueue'

const safe = {
  get(k) { try { return localStorage.getItem(k) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
}

// ── last-used wallet & recent categories (per device) ──────────────────────
export const getLastWallet = () => safe.get('fw:last')
export const setLastWallet = (id) => safe.set('fw:last', id)

export function getRecentCategories(groupId) {
  try { return JSON.parse(safe.get(`fw:recent:${groupId}`)) ?? [] } catch { return [] }
}
export function pushRecentCategory(groupId, category) {
  const next = [category, ...getRecentCategories(groupId).filter((c) => c !== category)].slice(0, 8)
  safe.set(`fw:recent:${groupId}`, JSON.stringify(next))
}

// ── expenses ────────────────────────────────────────────────────────────────
export function expenseArgs(e) {
  return {
    p_id: e.id,
    p_group: e.groupId,
    p_paid_by: e.paidBy,
    p_amount: e.amount,
    p_category: e.category,
    p_description: e.description || null,
    p_date: e.date,
    p_split_users: e.splitUsers ?? [],
  }
}

export const RPC_TIMEOUT_MS = 10000

/**
 * RPC with a timeout. Flaky mobile networks often *hang* instead of failing fast; without this
 * the UI would wait forever. A timed-out call resolves to a retryable "network" error.
 */
export async function rpcWithTimeout(name, args, ms = RPC_TIMEOUT_MS) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await createClient().rpc(name, args).abortSignal(ctl.signal)
    return ctl.signal.aborted && !res.error ? { error: Object.assign(new Error('Request timed out'), { retry: true }) } : res
  } catch (e) {
    return { error: Object.assign(new Error(ctl.signal.aborted ? 'Request timed out' : e.message), { retry: true }) }
  } finally {
    clearTimeout(timer)
  }
}

/** Save through the idempotent RPC; falls back to the offline queue on network failure/timeout. */
export async function saveExpense(expense) {
  const args = expenseArgs(expense)
  const { error } = await rpcWithTimeout('save_expense', args)
  if (!error) return { ok: true }
  if (isNetworkError(error) || /abort|timed out/i.test(error.message)) {
    createQueue().enqueue({ id: args.p_id, type: 'save_expense', args })
    return { ok: true, queued: true }
  }
  return { error }
}

/** Replay queued jobs (called on app start and when the browser comes back online). */
export async function flushOfflineQueue() {
  const queue = createQueue()
  if (!queue.size()) return { done: 0, failed: [], remaining: 0 }
  const { data: { session } } = await createClient().auth.getSession()
  return queue.flush(async (job) => {
    if (!session) return { error: Object.assign(new Error('Not signed in'), { retry: true }) }
    return rpcWithTimeout(job.type, job.args, 15000)
  })
}
