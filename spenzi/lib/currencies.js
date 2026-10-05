export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'CHF', 'JPY', 'TRY'].map((c) => ({ id: c, label: c }))

const BY_REGION = { IN: 'INR', US: 'USD', GB: 'GBP', AE: 'AED', SG: 'SGD', AU: 'AUD', CA: 'CAD', CH: 'CHF', JP: 'JPY', TR: 'TRY',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR' }

/** Best-effort default currency from a locale like "en-IN"; falls back to USD. */
export function guessCurrency(locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US') {
  const region = String(locale).split('-')[1]?.toUpperCase()
  return BY_REGION[region] ?? 'USD'
}
