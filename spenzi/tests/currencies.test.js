import { describe, it, expect } from 'vitest'
import { guessCurrency } from '../lib/currencies'

describe('guessCurrency', () => {
  it.each([['en-IN', 'INR'], ['en-GB', 'GBP'], ['de-DE', 'EUR'], ['en-us', 'USD'], ['fr', 'USD'], ['', 'USD'], [undefined, 'USD']])('%s -> %s', (l, c) => expect(guessCurrency(l)).toBe(c))
})
