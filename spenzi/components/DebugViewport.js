'use client'
import { useEffect, useState } from 'react'

/** Visit any page with ?debug=1 to overlay the viewport numbers (for diagnosing device layout). */
export default function DebugViewport() {
  const [info, setInfo] = useState(null)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('debug')) return
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
      setInfo({
        innerH: innerHeight, vvH: Math.round(window.visualViewport?.height ?? 0), screenH: screen.height,
        clientH: document.documentElement.clientHeight, fixedBottomAt: fb,
        safeTop: cs.paddingTop, safeBottom: cs.paddingBottom,
        standalone: navigator.standalone === true || matchMedia('(display-mode: standalone)').matches,
        app: Math.round(document.getElementById('app-scroll')?.getBoundingClientRect().height ?? 0),
      })
    }
    read(); addEventListener('resize', read)
    return () => { removeEventListener('resize', read); probe.remove() }
  }, [])
  if (!info) return null
  return (
    <pre className="pointer-events-none fixed left-2 top-16 z-[200] rounded bg-black/80 p-2 text-[10px] leading-tight text-green-300">
      {JSON.stringify(info, null, 1)}
    </pre>
  )
}
