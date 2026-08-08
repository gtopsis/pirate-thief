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
  it('shows a plain count when every matching job is shown', () => {
    expect(formatJobCountText(5, 5)).toBe('5 jobs')
  })

  it('uses the singular word when exactly one job is shown', () => {
    expect(formatJobCountText(1, 1)).toBe('1 job')
  })

  it('spells out "Showing N of M" when the shown count is narrower than the total', () => {
    expect(formatJobCountText(3, 12)).toBe('Showing 3 of 12 jobs')
  })

  it('handles zero shown out of some total', () => {
    expect(formatJobCountText(0, 12)).toBe('Showing 0 of 12 jobs')
  })
})
