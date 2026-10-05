// Tiny persistent job queue so expenses entered offline are not lost.
// Jobs must be idempotent (save_expense is, via its client-generated id).

const KEY = 'fw:queue'

export function isNetworkError(err) {
  if (!err) return false
  if (err.retry) return true // e.g. not signed in yet: keep the job, try later
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  return /failed to fetch|networkerror|load failed|network request failed|timed out/i.test(err.message ?? '')
}

export function createQueue(storage = globalThis.localStorage) {
  const load = () => { try { return JSON.parse(storage.getItem(KEY)) ?? [] } catch { return [] } }
  const save = (jobs) => { try { storage.setItem(KEY, JSON.stringify(jobs)) } catch { /* quota/private */ } }

  return {
    size: () => load().length,
    list: load,

    enqueue(job) {
      const jobs = load().filter((j) => j.id !== job.id) // re-saving the same id replaces it
      jobs.push(job)
      save(jobs)
    },

    /**
     * run(job) -> Promise<{ error } | undefined>. Network errors stop the flush (retry later);
     * any other error is permanent, so the job is dropped and reported in `failed`.
     */
    async flush(run) {
      let done = 0
      const failed = []
      let jobs = load()
      while (jobs.length) {
        const job = jobs[0]
        let res
        try { res = (await run(job)) ?? {} } catch (e) { res = { error: e } }
        if (res.error && isNetworkError(res.error)) break
        if (res.error) failed.push({ job, message: res.error.message })
        else done++
        jobs = load().filter((j) => j.id !== job.id)
        save(jobs)
      }
      return { done, failed, remaining: load().length }
    },
  }
}
