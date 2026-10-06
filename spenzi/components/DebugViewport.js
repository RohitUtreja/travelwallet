'use client'
import { useEffect, useState } from 'react'

/**
 * Overlays viewport numbers for diagnosing device layout. Enable with ?debug=1 in the URL, or (in an
 * installed app) tap the "FamilyWallet" text at the bottom of Profile five times. Persisted in localStorage.
 */
export default function DebugViewport() {
  const [info, setInfo] = useState(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).has('debug')
    if (fromUrl) { try { localStorage.setItem('fw:debug', '1') } catch { /* private mode */ } }
    const read = () => { try { return fromUrl || localStorage.getItem('fw:debug') === '1' } catch { return fromUrl } }
    setOn(read())
    const sync = () => setOn(read())
    window.addEventListener('fw:debug-toggle', sync)
    return () => window.removeEventListener('fw:debug-toggle', sync)
  }, [])

  useEffect(() => {
    if (!on) { setInfo(null); return }
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;left:0;top:0;width:0;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0;visibility:hidden'
    document.body.appendChild(probe)
    const read = () => {
      const cs = getComputedStyle(probe)
      const fixedBottom = document.createElement('div')
      fixedBottom.style.cssText = 'position:fixed;bottom:0;height:1px;width:1px'
      document.body.appendChild(fixedBottom)
      const fb = Math.round(fixedBottom.getBoundingClientRect().bottom)
      fixedBottom.remove()
      const units = {}
      for (const u of ['vh', 'lvh', 'svh', 'dvh']) {
        const t = document.createElement('div')
        t.style.cssText = `position:fixed;top:0;left:0;width:1px;height:100${u};visibility:hidden`
        document.body.appendChild(t); units[u] = Math.round(t.getBoundingClientRect().height); t.remove()
      }
      setInfo({
        innerH: innerHeight, vvH: Math.round(window.visualViewport?.height ?? 0), screenH: screen.height,
        clientH: document.documentElement.clientHeight, fixedBottomAt: fb,
        safeTop: cs.paddingTop, safeBottom: cs.paddingBottom,
        standalone: navigator.standalone === true || matchMedia('(display-mode: standalone)').matches,
        units, navBottom: Math.round(document.querySelector('nav[aria-label=Main]')?.getBoundingClientRect().bottom ?? 0),
        docH: document.documentElement.scrollHeight, docScrollable: document.documentElement.scrollHeight > innerHeight,
      })
    }
    read(); addEventListener('resize', read)
    return () => { removeEventListener('resize', read); probe.remove() }
  }, [on])
  if (!info) return null
  return (
    <pre className="pointer-events-none fixed left-2 top-16 z-[200] rounded bg-black/80 p-2 text-[10px] leading-tight text-green-300">
      {JSON.stringify(info, null, 1)}
    </pre>
  )
}
