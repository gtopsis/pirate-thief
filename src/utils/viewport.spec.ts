import { describe, it, expect, vi, afterEach } from 'vitest'
import { isMobileViewport, watchMobileViewport } from '@/utils/viewport'

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

/** A minimal fake MediaQueryList that supports the change-listener API `watchMobileViewport` needs. */
const createFakeMediaQueryList = (initialMatches: boolean) => {
  let matches = initialMatches
  const listeners = new Set<(event: MediaQueryListEvent) => void>()

  return {
    get matches() {
      return matches
    },
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    },
    simulateChange(newMatches: boolean): void {
      matches = newMatches
      for (const listener of listeners) {
        listener({ matches: newMatches } as MediaQueryListEvent)
      }
    }
  }
}

describe('watchMobileViewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls back with the new value whenever the breakpoint match flips', () => {
    const fakeQuery = createFakeMediaQueryList(false)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(fakeQuery) as unknown)

    const onChange = vi.fn()
    watchMobileViewport(onChange)

    fakeQuery.simulateChange(true)
    expect(onChange).toHaveBeenLastCalledWith(true)

    fakeQuery.simulateChange(false)
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('stops calling back after the returned unsubscribe function runs', () => {
    const fakeQuery = createFakeMediaQueryList(false)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(fakeQuery) as unknown)

    const onChange = vi.fn()
    const stop = watchMobileViewport(onChange)
    stop()

    fakeQuery.simulateChange(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('returns a no-op unsubscribe and never calls back when matchMedia is unavailable', () => {
    expect(typeof window.matchMedia).not.toBe('function')

    const onChange = vi.fn()
    expect(() => {
      watchMobileViewport(onChange)()
    }).not.toThrow()
    expect(onChange).not.toHaveBeenCalled()
  })
})
