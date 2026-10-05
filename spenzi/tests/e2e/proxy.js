// Maps Supabase URL space onto PostgREST and fakes GoTrue (password login/refresh/user).
const http = require('http'), crypto = require('crypto')
const SECRET = 'super-secret-jwt-key-with-at-least-32-chars!!'
const USERS = {
  'rohit@family.test': '11111111-0000-4000-8000-000000000001',
  'priya@family.test': '22222222-0000-4000-8000-000000000002',
  'aarav@family.test': '33333333-0000-4000-8000-000000000003',
  'meera@family.test': '44444444-0000-4000-8000-000000000004',
}
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
function jwt(sub, email) {
  const now = Math.floor(Date.now() / 1000)
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, email, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600 })}`
  return `${body}.${crypto.createHmac('sha256', SECRET).update(body).digest('base64url')}`
}
const session = (email) => {
  const id = USERS[email]
  return { access_token: jwt(id, email), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `rt-${email}`,
    user: { id, aud: 'authenticated', role: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }
}
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
const FAIL = process.env.FAIL_REST // when set, simulates network loss for REST
http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end() }
  const url = new URL(req.url, 'http://x')
  let body = []
  req.on('data', (c) => body.push(c))
  req.on('end', () => {
    body = Buffer.concat(body)
    const json = (code, o) => { res.writeHead(code, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
    if (url.pathname === '/auth/v1/token') {
      const j = JSON.parse(body.toString() || '{}')
      const email = (url.searchParams.get('grant_type') === 'refresh_token' ? String(j.refresh_token).replace('rt-', '') : j.email)
      return USERS[email] && (url.searchParams.get('grant_type') === 'refresh_token' || j.password === 'pw')
        ? json(200, session(email)) : json(400, { error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' })
    }
    if (url.pathname === '/auth/v1/user') {
      const t = (req.headers.authorization || '').replace('Bearer ', '')
      try { const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64url')); return json(200, session(p.email).user) } catch { return json(401, {}) }
    }
    if (url.pathname === '/auth/v1/logout') { res.writeHead(204, cors); return res.end() }
    if (url.pathname.startsWith('/rest/v1/')) {
      if (global.OFFLINE) { req.destroy(); return }
      const headers = { ...req.headers, host: '127.0.0.1:3000' }
      const up = http.request({ host: '127.0.0.1', port: 3000, path: url.pathname.replace('/rest/v1', '') + url.search, method: req.method, headers }, (r) => {
        res.writeHead(r.statusCode, { ...r.headers, ...cors }); r.pipe(res)
      })
      up.on('error', () => json(502, { message: 'bad gateway' }))
      return up.end(body)
    }
    if (url.pathname === '/__offline') { global.OFFLINE = url.searchParams.get('on') === '1'; return json(200, { offline: global.OFFLINE }) }
    json(404, { message: 'not found' })
  })
}).listen(3001, () => console.log('proxy on 3001'))
