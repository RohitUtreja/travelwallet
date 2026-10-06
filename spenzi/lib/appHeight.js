/**
 * The height the app can draw into, in CSS px — the single source of truth for layout, published as
 * the --app-h CSS variable (scroll area, bottom bar, toasts, sheets all derive from it).
 *
 * This is window.innerHeight: the area above a browser's own toolbar in Safari, and the area iOS
 * will actually paint in an installed app. NOTE: an earlier version "corrected" the installed iOS
 * app to screen.height (874 vs the reported 812), but iOS does not paint below the reported
 * viewport — the bottom bar was clipped — so that correction was removed.
 *
 * SELF-CONTAINED ON PURPOSE: it is also inlined into <head> via Function#toString so the value is
 * set before first paint. Do not reference anything outside this function.
 */
export function appHeight(env) {
  return (env || window).innerHeight
}
