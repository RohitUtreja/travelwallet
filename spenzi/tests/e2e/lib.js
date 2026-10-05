const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const fs = require('fs')
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const BASE = process.env.APP_URL || 'http://localhost:3002'
let pass = 0, fail = 0
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond ? '' : ' :: ' + extra}`) }
async function launch(opts = {}) {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true, ...opts })
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()) // offline sandbox: use fallbacks quickly
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts/.test(m.text())) console.log('CONSOLE', m.text().slice(0, 200)) })
  return { browser, ctx, page }
}
async function login(page, who = 'rohit') {
  await page.goto(BASE + '/login')
  await page.getByLabel('Email').fill(`${who}@family.test`)
  await page.getByLabel('Password', { exact: true }).fill('pw')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/groups', { timeout: 15000 })
}
async function axe(page, name, { ignore = [] } = {}) {
  await page.waitForTimeout(800) // let enter-animations finish: axe mis-measures contrast on half-transparent elements
  await page.evaluate(AXE)
  const res = await page.evaluate(async (ign) => await axe.run({ exclude: [['[role="log"]']] }, { rules: Object.fromEntries(ign.map((r) => [r, { enabled: false }])), runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }), ignore)
  const bad = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
  check(`a11y: ${name}`, bad.length === 0, bad.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0].html.slice(0, 120)}`).join(' | '))
  return res.violations
}
fs.mkdirSync(`${__dirname}/shots`, { recursive: true })
const shot = (page, name, full = false) => page.screenshot({ path: `${__dirname}/shots/${name}.png`, fullPage: full })
const summary = () => { console.log(`== ${pass} passed, ${fail} failed`); return fail === 0 }
module.exports = { launch, login, axe, shot, check, summary, BASE }

const { execSync } = require('child_process')
execSync(__dirname + '/seed.sh', { stdio: 'ignore' }) // fresh, deterministic data for every script run
const ids = Object.fromEntries(fs.readFileSync(`${__dirname}/ids.env`, 'utf8').trim().split(' ').map((kv) => kv.split('=')))
const sql = (q) => execSync(`psql -h ${process.env.PGHOST || '/tmp'} -p ${process.env.PGPORT || 54329} -U ${process.env.PGUSER || 'postgres'} -d ${process.env.PGDATABASE || 'fw'} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim()
const press = async (page, digits) => { for (const ch of digits) await page.getByRole('button', { name: ch === '.' ? 'Decimal point' : ch, exact: true }).click() }
const toast = (page, re, timeout = 6000) => page.getByRole('status').filter({ hasText: re }).waitFor({ timeout }).then(() => true, () => false)
module.exports = { ...module.exports, ids, sql, press, toast }
