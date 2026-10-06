'use client'
import { useEffect } from 'react'
import { appHeight } from '@/lib/appHeight'

/** Keeps --app-h (see lib/appHeight.js) current across rotation, resize and returning to the app. */
export default function ViewportSync() {
  useEffect(() => {
    const set = () => document.documentElement.style.setProperty('--app-h', `${appHeight()}px`)
    set()
    const events = ['resize', 'orientationchange', 'pageshow', 'visibilitychange']
    events.forEach((e) => window.addEventListener(e, set))
    window.visualViewport?.addEventListener('resize', set)
    // iOS reports the new size a moment after rotation
    const late = () => setTimeout(set, 300)
    window.addEventListener('orientationchange', late)
    return () => {
      events.forEach((e) => window.removeEventListener(e, set))
      window.visualViewport?.removeEventListener('resize', set)
      window.removeEventListener('orientationchange', late)
    }
  }, [])
  return null
}
