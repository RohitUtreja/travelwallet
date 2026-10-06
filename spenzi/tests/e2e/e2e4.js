// Regression: the DOCUMENT scrolls (iOS reports the full-screen viewport only then), it never moves
// sideways, header+tabs stay visible, the bottom pill is anchored to the measured height, and landing
// after saving an expense has no offset.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const { execSync } = require('child_process'); require('fs').mkdirSync(__dirname + '/shots', { recursive: true })
execSync(__dirname + '/seed.sh', { stdio: 'ignore' })
const ids = Object.fromEntries(require('fs').readFileSync(__dirname + '/ids.env', 'utf8').trim().split(' ').map((x) => x.split('=')))
const B = process.env.APP_URL || 'http://localhost:3002'; let fail = 0
const check = (n, c, x = '') => { if (!c) fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' :: ' + x}`) }
const login = async (page) => { await page.goto(B + '/login'); await page.getByLabel('Email').fill('rohit@family.test'); await page.getByLabel('Password', { exact: true }).fill('pw'); await page.getByRole('button', { name: 'Sign in' }).click() }
;(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  const page = await ctx.newPage()
  const state = () => page.evaluate(() => ({ wx: Math.round(scrollX), wy: Math.round(scrollY), docW: document.documentElement.scrollWidth, vw: innerWidth, docH: document.documentElement.scrollHeight, vh: innerHeight }))
  await login(page); await page.waitForSelector('text=Utreja Household')
  await page.goto(`${B}/groups/${ids.FAM}`); await page.waitForSelector('text=Spent in'); await page.waitForTimeout(800)
  let s = await state(); check('document is scrollable (iOS then reports the full-screen viewport)', s.docH > s.vh, JSON.stringify(s))
  await page.evaluate(() => scrollTo(0, 900)); await page.waitForTimeout(300)
  s = await state(); check('document scrolls vertically', s.wy > 300, JSON.stringify(s))
  await page.evaluate(() => scrollTo(80, 900)); await page.waitForTimeout(200)
  s = await state(); check('cannot be pushed sideways', s.wx === 0 && s.docW <= s.vw, JSON.stringify(s))
  const tab = page.getByRole('tab', { name: 'Expenses' }); const bx = await tab.boundingBox()
  const topEl = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.closest('[role=tab]')?.textContent : null }, [bx.x + bx.width / 2, bx.y + bx.height / 2])
  check('header + tabs stay visible and tappable while scrolled', topEl === 'Expenses', String(topEl))
  await page.screenshot({ path: __dirname + '/shots/scrolled.png' })
  // add -> save -> land
  await page.goto(`${B}/groups/${ids.FAM}/add`); await page.waitForSelector('text=Add expense')
  s = await state(); check('add screen (fits exactly) is still scrollable by 1px', s.docH > s.vh, JSON.stringify(s))
  for (const k of ['2', '5', '0']) await page.getByRole('button', { name: k, exact: true }).click()
  await page.getByPlaceholder('Add a note (optional)').fill('Landing test'); await page.getByRole('button', { name: 'Save expense' }).click()
  await page.waitForURL(`**/groups/${ids.FAM}`)
  for (const t of [100, 500, 1200, 2500]) { await page.waitForTimeout(t === 100 ? 100 : t - 100); s = await state(); check(`landing @${t}ms: no sideways offset, at top`, s.wx === 0 && s.wy === 0 && s.docW <= s.vw, JSON.stringify(s)) }
  // floating bar anchored to --app-h
  await page.goto(`${B}/groups`); await page.waitForSelector('text=Your wallets'); await page.waitForTimeout(600)
  const g = await page.evaluate(() => { const n = document.querySelector('nav[aria-label=Main]').getBoundingClientRect(); return { appH: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim(), navBottom: Math.round(n.bottom), innerH: innerHeight } })
  check('--app-h equals the visible height', g.appH === `${g.innerH}px`, JSON.stringify(g))
  check('bottom bar ends exactly at the bottom of the visible area', g.navBottom === g.innerH, JSON.stringify(g))
  // simulated installed iOS app with a short viewport
  const ctx2 = await b.newContext({ viewport: { width: 402, height: 812 }, isMobile: true, hasTouch: true })
  await ctx2.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { value: true }) })
  await ctx2.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  const p2 = await ctx2.newPage(); await login(p2); await p2.waitForSelector('text=Your wallets'); await p2.waitForTimeout(600)
  const g2 = await p2.evaluate(() => ({ appH: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim(), navBottom: Math.round(document.querySelector('nav[aria-label=Main]').getBoundingClientRect().bottom), innerH: innerHeight }))
  check('installed iOS (short viewport): bar stays fully inside the drawable area', g2.appH === '812px' && g2.navBottom === 812, JSON.stringify(g2))
  await ctx2.close()
  console.log(fail ? `== ${fail} FAILED` : '== all passed'); await b.close(); process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('CRASH', e.message.split('\n')[0]); process.exit(2) })
