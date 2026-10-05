const MAX_INT_DIGITS = 9
const MAX_DECIMALS = 2

/** Apply one keypad press ('0'-'9' | 'dot' | 'back') to the amount string being typed. */
export function nextAmount(cur, key) {
  if (key === 'back') return cur.slice(0, -1)
  if (key === 'dot') return cur.includes('.') ? cur : (cur || '0') + '.'
  if (!/^\d$/.test(key)) return cur
  const [int, dec] = cur.split('.')
  if (dec !== undefined) return dec.length >= MAX_DECIMALS ? cur : cur + key
  if (int.length >= MAX_INT_DIGITS) return cur
  return int === '0' ? key : cur + key // no leading zeros ("05")
}

/** "1234.5" -> "1,234.5"; keeps a trailing dot / partial decimals so typing feels natural. */
export function displayAmount(str, locale) {
  if (!str) return '0'
  const [int, dec] = str.split('.')
  const grouped = Number(int || 0).toLocaleString(locale, { maximumFractionDigits: 0 })
  return dec === undefined ? grouped : `${grouped}.${dec}`
}

/** Number -> editable string without trailing zeros (450.5 -> "450.5", 12 -> "12"). */
export function toEditable(n) {
  return n ? String(Number(n)) : ''
}
