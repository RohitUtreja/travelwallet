// Device-local app lock. A convenience/privacy screen, NOT a security boundary:
// the Supabase session is unaffected. Hashes with PBKDF2 and rate-limits guesses.

const ITER = 150000
const KEY = 'fw:pin'
const ATTEMPTS = 'fw:pin_attempts'
const MAX_FREE_TRIES = 5

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(pin, salt, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256)
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function createPinStore(storage = globalThis.localStorage, now = () => Date.now()) {
  const read = (k) => { try { return JSON.parse(storage.getItem(k)) } catch { return null } }
  const write = (k, v) => { try { storage.setItem(k, JSON.stringify(v)) } catch { /* private mode */ } }

  return {
    isEnabled: () => !!read(KEY),
    /** digits to collect before verifying (so partial entry never counts as a failed try) */
    length: () => read(KEY)?.len ?? 4,

    async set(pin) {
      if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN must be 4-6 digits')
      const salt = crypto.getRandomValues(new Uint8Array(16))
      write(KEY, { salt: b64(salt), hash: b64(await derive(pin, salt, ITER)), iter: ITER, len: pin.length })
      storage.removeItem(ATTEMPTS)
    },

    clear() {
      storage.removeItem(KEY)
      storage.removeItem(ATTEMPTS)
    },

    /** -> { ok } or { ok:false, waitMs } when throttled */
    async verify(pin) {
      const rec = read(KEY)
      if (!rec) return { ok: true }
      const st = read(ATTEMPTS) ?? { count: 0, until: 0 }
      if (st.until > now()) return { ok: false, waitMs: st.until - now() }

      const hash = b64(await derive(pin, unb64(rec.salt), rec.iter))
      if (safeEqual(hash, rec.hash)) {
        storage.removeItem(ATTEMPTS)
        return { ok: true }
      }
      const count = st.count + 1
      // after 5 free tries: 30s, then doubling, capped at 15 min
      const wait = count >= MAX_FREE_TRIES ? Math.min(30000 * 2 ** (count - MAX_FREE_TRIES), 900000) : 0
      write(ATTEMPTS, { count, until: wait ? now() + wait : 0 })
      return { ok: false, waitMs: wait }
    },
  }
}
