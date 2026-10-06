/**
 * Diagnostic: apply each page-locking setting off, one at a time, and record what the browser reports.
 * Used from Profile (debug mode) to find which setting makes iOS mark part of the screen unusable.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function measure(label) {
  const unit = (u) => {
    const t = document.createElement('div')
    t.style.cssText = `position:fixed;top:0;left:0;width:1px;height:100${u};visibility:hidden`
    document.body.appendChild(t); const h = Math.round(t.getBoundingClientRect().height); t.remove(); return h
  }
  const fb = document.createElement('div')
  fb.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;visibility:hidden'
  document.body.appendChild(fb); const bottom = Math.round(fb.getBoundingClientRect().bottom); fb.remove()
  return `${label.padEnd(26)} inner ${innerHeight} | dvh ${unit('dvh')} | svh ${unit('svh')} | fixedBottom ${bottom}`
}

export async function runViewportLab(onLine) {
  const html = document.documentElement
  const body = document.body
  const scroller = document.getElementById('app-scroll')
  const meta = document.querySelector('meta[name=viewport]')
  const originalMeta = meta?.getAttribute('content')

  const set = (el, styles) => {
    const prev = {}
    for (const [k, v] of Object.entries(styles)) { prev[k] = el.style[k]; el.style[k] = v }
    return () => { for (const [k, v] of Object.entries(prev)) el.style[k] = v }
  }
  const variants = [
    ['baseline', () => () => {}],
    ['html overflow visible', () => set(html, { overflow: 'visible' })],
    ['html+body overflow visible', () => { const a = set(html, { overflow: 'visible' }); const b = set(body, { overflow: 'visible' }); return () => { a(); b() } }],
    ['html+body height auto', () => { const a = set(html, { height: 'auto' }); const b = set(body, { height: 'auto' }); return () => { a(); b() } }],
    ['overscroll-behavior auto', () => { const a = set(html, { overscrollBehavior: 'auto' }); const b = set(body, { overscrollBehavior: 'auto' }); const c = set(scroller, { overscrollBehavior: 'auto' }); return () => { a(); b(); c() } }],
    ['touch-action auto', () => { const a = set(body, { touchAction: 'auto' }); const b = set(scroller, { touchAction: 'auto' }); return () => { a(); b() } }],
    ['scroller not fixed (doc scroll)', () => { const a = set(html, { overflow: 'visible', height: 'auto' }); const b = set(body, { overflow: 'visible', height: 'auto' }); const c = set(scroller, { position: 'static', height: 'auto' }); return () => { a(); b(); c() } }],
    ['viewport: no minimum-scale', () => { meta?.setAttribute('content', (originalMeta ?? '').replace(/,?\s*minimum-scale=1/, '')); return () => meta?.setAttribute('content', originalMeta ?? '') }],
    ['viewport: no viewport-fit', () => { meta?.setAttribute('content', (originalMeta ?? '').replace(/,?\s*viewport-fit=cover/, '')); return () => meta?.setAttribute('content', originalMeta ?? '') }],
  ]
  for (const [label, apply] of variants) {
    const revert = apply()
    await sleep(700)
    onLine(measure(label))
    revert()
    await sleep(400)
  }
  onLine(measure('restored (baseline)'))
}
