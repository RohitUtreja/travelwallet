// FamilyWallet service worker.
// Rules: never touch cross-origin traffic (Supabase API/auth, fonts) or non-GET requests.
// Pages are network-first (fall back to cache offline); hashed Next assets are cache-first;
// other same-origin files are stale-while-revalidate.
const CACHE = 'familywallet-v2'
const SHELL = ['/', '/login', '/groups', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

const put = (request, response) => {
  if (response && response.ok && response.type === 'basic') {
    const copy = response.clone()
    caches.open(CACHE).then((c) => c.put(request, copy))
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // API, auth, fonts: always the network

  // page navigations
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((r) => put(request, r)).catch(() => caches.match(request).then((c) => c || caches.match('/')))
    )
    return
  }

  // immutable, content-hashed build output
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.match(request).then((c) => c || fetch(request).then((r) => put(request, r))))
    return
  }

  // everything else same-origin: serve cached, refresh in background
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((r) => put(request, r)).catch(() => cached)
      return cached || network
    })
  )
})
