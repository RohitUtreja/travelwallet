import { describe, it, expect } from 'vitest'
import { appHeight } from '../lib/appHeight'

describe('appHeight', () => {
  it('is the reported viewport height (Safari: area above the toolbar)', () => {
    expect(appHeight({ innerHeight: 714 })).toBe(714)
  })
  it('does not exceed what iOS paints in the installed app (812 of a 874 screen)', () => {
    expect(appHeight({ innerHeight: 812, screen: { height: 874 } })).toBe(812)
  })
  it('is self-contained so it can be inlined into <head>', () => {
    const run = new Function('window', `return (${appHeight.toString()})()`)
    expect(run({ innerHeight: 777 })).toBe(777)
  })
})
