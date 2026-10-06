// Regression: the window must never scroll/pan (iOS sideways shift); #app-scroll scrolls; header+tabs stay visible.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const { execSync } = require('child_process'); require('fs').mkdirSync(__dirname + '/shots', { recursive: true })
execSync(__dirname + '/seed.sh', { stdio: 'ignore' })
const ids = Object.fromEntries(require('fs').readFileSync(__dirname + '/ids.env', 'utf8').trim().split(' ').map((x) => x.split('=')))
const B = process.env.APP_URL || 'http://localhost:3002'; let fail = 0
const check = (n, c, x = '') => { if (!c) fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n}${c ? '' : ' :: ' + x}`) }
;(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] })
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  const page = await ctx.newPage()
  const state = () => page.evaluate(() => { const a = document.getElementById('app-scroll'); return { wx: scrollX, wy: scrollY, docScrollable: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1, ax: a.scrollLeft, ay: Math.round(a.scrollTop), aw: a.scrollWidth, acw: a.clientWidth, vw: innerWidth } })
  await page.goto(B + '/login'); await page.getByLabel('Email').fill('rohit@family.test'); await page.getByLabel('Password', { exact: true }).fill('pw'); await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForSelector('text=Utreja Household')
  await page.goto(`${B}/groups/${ids.FAM}`); await page.waitForSelector('text=Spent in'); await page.waitForTimeout(800)
  // scroll the inner container down
  await page.evaluate(() => document.getElementById('app-scroll').scrollTo(0, 900)); await page.waitForTimeout(400)
  let s = await state(); check('inner scroller scrolls vertically', s.ay > 300, JSON.stringify(s))
  check('window itself never scrolls', s.wx === 0 && s.wy === 0 && !s.docScrollable, JSON.stringify(s))
  // try to push the window / scroller sideways
  await page.evaluate(() => { scrollTo(80, 80); document.getElementById('app-scroll').scrollTo(80, 900) }); await page.waitForTimeout(200)
  s = await state(); check('cannot be pushed sideways (window)', s.wx === 0 && s.wy === 0, JSON.stringify(s))
  check('inner scroller has no horizontal overflow', s.aw <= s.acw, JSON.stringify(s))
  // header + tabs stay visible and tappable while scrolled
  const tab = page.getByRole('tab', { name: 'Expenses' }); const bx = await tab.boundingBox()
  const topEl = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.closest('[role=tab]')?.textContent : null }, [bx.x + bx.width / 2, bx.y + bx.height / 2])
  check('tabs visible (not hidden behind header) while scrolled', topEl === 'Expenses', String(topEl))
  await page.screenshot({ path: __dirname + '/shots/lock-scrolled.png' })
  // the full add -> save -> land flow, then check the landing state
  await page.goto(`${B}/groups/${ids.FAM}/add`); await page.waitForSelector('text=Add expense')
  for (const k of ['2', '5', '0']) await page.getByRole('button', { name: k, exact: true }).click()
  await page.getByPlaceholder('Add a note (optional)').fill('Landing test'); await page.getByRole('button', { name: 'Save expense' }).click()
  await page.waitForURL(`**/groups/${ids.FAM}`); 
  for (const t of [100, 500, 1200, 2500]) { await page.waitForTimeout(t === 100 ? 100 : t - 100); s = await state(); check(`landing @${t}ms: no sideways offset, at top`, s.wx === 0 && s.wy === 0 && s.ax === 0 && s.ay === 0 && s.aw <= s.acw, JSON.stringify(s)) }
  await page.screenshot({ path: __dirname + '/shots/lock-landed.png' })

  // ── bottom bar is anchored to the measured height (--app-h): no gap in a normal browser ──
  await page.goto(`${B}/groups`); await page.waitForSelector('text=Your wallets'); await page.waitForTimeout(600)
  const geo = () => page.evaluate(() => { const nav = document.querySelector('nav[aria-label=Main]').getBoundingClientRect(); const sc = document.getElementById('app-scroll').getBoundingClientRect(); return { appH: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim(), navBottom: Math.round(nav.bottom), scrollBottom: Math.round(sc.bottom), innerH: innerHeight } })
  let g = await geo(); check('browser: --app-h equals the visible height', g.appH === `${g.innerH}px`, JSON.stringify(g))
  check('browser: bottom bar and scroll area end exactly at the bottom', g.navBottom === g.innerH && g.scrollBottom === g.innerH, JSON.stringify(g))

  // ── simulated installed iOS app: viewport reported 62px shorter than the real screen ──
  const ctx2 = await b.newContext({ viewport: { width: 402, height: 812 }, isMobile: true, hasTouch: true })
  await ctx2.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { value: true }); Object.defineProperty(screen, 'width', { value: 402 }); Object.defineProperty(screen, 'height', { value: 874 }) })
  await ctx2.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort())
  const p2 = await ctx2.newPage(); await p2.goto(`${B}/login`); await p2.getByLabel('Email').fill('rohit@family.test'); await p2.getByLabel('Password', { exact: true }).fill('pw'); await p2.getByRole('button', { name: 'Sign in' }).click()
  await p2.waitForSelector('text=Your wallets'); await p2.waitForTimeout(600)
  const g2 = await p2.evaluate(() => ({ appH: getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim(), navBottom: Math.round(document.querySelector('nav[aria-label=Main]').getBoundingClientRect().bottom), innerH: innerHeight }))
  check('installed iOS: --app-h is the full screen (874), not the short viewport (812)', g2.appH === '874px' && g2.innerH === 812, JSON.stringify(g2))
  check('installed iOS: bottom bar ends at the real screen bottom', g2.navBottom === 874, JSON.stringify(g2))
  await ctx2.close()
  console.log(fail ? `== ${fail} FAILED` : '== all passed'); await b.close(); process.exit(fail ? 1 : 0)
})().catch((e) => { console.error('CRASH', e.message.split('\n')[0]); process.exit(2) })
