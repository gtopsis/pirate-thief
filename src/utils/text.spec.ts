import { describe, it, expect } from 'vitest'
import { formatJobCountText, pluralize } from '@/utils/text'

describe('pluralize', () => {
  it('returns the singular word for a count of 1', () => {
    expect(pluralize(1, 'job')).toBe('job')
  })

  it.each([0, 2, 5])('returns the plural word for a count of %i', (count) => {
    expect(pluralize(count, 'job')).toBe('jobs')
  })
})

describe('formatJobCountText', () => {
  it('pluralizes for a count other than 1', () => {
    expect(formatJobCountText(5)).toBe('5 jobs')
  })

  it('uses the singular word for a count of exactly 1', () => {
    expect(formatJobCountText(1)).toBe('1 job')
  })

  it('handles a count of zero', () => {
    expect(formatJobCountText(0)).toBe('0 jobs')
  })
})
