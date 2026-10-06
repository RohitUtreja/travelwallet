import { describe, it, expect } from 'vitest'
import { appHeight } from '../lib/appHeight'

const phone = { screenWidth: 402, screenHeight: 874 } // iPhone with notch, portrait dims as iOS reports

describe('appHeight', () => {
  it('Safari: uses the visible area above the toolbar (bar sits on the toolbar)', () => {
    expect(appHeight({ ...phone, innerWidth: 402, innerHeight: 714, iosStandalone: false })).toBe(714)
  })
  it('installed iOS app: uses the full screen when the reported viewport is short by the inset', () => {
    expect(appHeight({ ...phone, innerWidth: 402, innerHeight: 812, iosStandalone: true })).toBe(874) // real report
  })
  it('installed iOS app that already reports the full height is unchanged', () => {
    expect(appHeight({ ...phone, innerWidth: 402, innerHeight: 874, iosStandalone: true })).toBe(874)
  })
  it('installed iOS app in landscape uses the short screen side', () => {
    expect(appHeight({ ...phone, innerWidth: 874, innerHeight: 360, iosStandalone: true })).toBe(402)
  })
  it('never "corrects" a large difference (e.g. something else is using the space)', () => {
    expect(appHeight({ ...phone, innerWidth: 402, innerHeight: 500, iosStandalone: true })).toBe(500)
  })
  it('non-iOS installed apps and desktops are never touched', () => {
    expect(appHeight({ screenWidth: 1920, screenHeight: 1080, innerWidth: 1000, innerHeight: 1000, iosStandalone: false })).toBe(1000)
  })
  it('is self-contained so it can be inlined into <head>', () => {
    // evaluate its source in isolation with only a stubbed window/screen
    const src = appHeight.toString()
    const run = new Function('window', 'screen', `return (${src})()`)
    expect(run({ innerHeight: 812, innerWidth: 402, navigator: { standalone: true } }, { width: 402, height: 874 })).toBe(874)
    expect(run({ innerHeight: 700, innerWidth: 402, navigator: {} }, { width: 402, height: 874 })).toBe(700)
  })
})
