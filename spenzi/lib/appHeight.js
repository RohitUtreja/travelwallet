/**
 * The real height the app can draw into, in CSS px — the single source of truth for layout
 * (published as the --app-h CSS variable and used by the scroll area, bottom bar, toasts, sheets).
 *
 *  - Safari / any browser: window.innerHeight. That is the area above the browser's own toolbar,
 *    so the bottom bar sits right on the toolbar with no gap.
 *  - Installed iOS app (navigator.standalone): iOS reports a viewport shorter than the screen by about
 *    the status-bar inset (e.g. 812 of 874), which left a gap under the bottom bar. There the real
 *    window is the screen, so use the screen's portrait/landscape height instead.
 *
 * SELF-CONTAINED ON PURPOSE: it is also inlined into <head> via Function#toString so the value is
 * set before first paint. Do not reference anything outside this function. `env` is for tests.
 */
export function appHeight(env) {
  var e = env || {
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    screenWidth: screen.width,
    screenHeight: screen.height,
    iosStandalone: window.navigator.standalone === true,
  }
  var h = e.innerHeight
  if (!e.iosStandalone) return h
  // iOS reports screen dimensions in portrait orientation regardless of rotation
  var long = Math.max(e.screenWidth, e.screenHeight)
  var short = Math.min(e.screenWidth, e.screenHeight)
  var full = e.innerHeight >= e.innerWidth ? long : short
  var missing = full - h
  // only correct the known "viewport shorter than screen by the inset" case, never a big difference
  return missing > 0 && missing <= 100 ? full : h
}
