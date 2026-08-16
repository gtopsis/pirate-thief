import { describe, it, expect, vi, afterEach } from 'vitest'
import { isMobileViewport } from '@/utils/viewport'

describe('isMobileViewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns true when the viewport matches the mobile media query', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }) as unknown)

    expect(isMobileViewport()).toBe(true)
  })

  it('returns false when the viewport does not match the mobile media query', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }) as unknown)

    expect(isMobileViewport()).toBe(false)
  })

  it('returns false when matchMedia is unavailable (e.g. this test environment)', () => {
    expect(typeof window.matchMedia).not.toBe('function')
    expect(isMobileViewport()).toBe(false)
  })
})
