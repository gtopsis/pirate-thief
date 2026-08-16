import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useIsMobileViewport } from '@/composables/useIsMobileViewport'

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

/**
 * useIsMobileViewport uses lifecycle hooks internally, which require an
 * active component instance to register -- so it's called inside a
 * trivial host component's setup(), per Vue's guidance for testing
 * composables.
 */
const withIsMobileViewport = () => {
  let isMobile!: ReturnType<typeof useIsMobileViewport>
  const TestComponent = defineComponent({
    setup() {
      isMobile = useIsMobileViewport()
      return () => h('div')
    }
  })
  const wrapper = mount(TestComponent)
  return {
    isMobile,
    unmount: () => {
      wrapper.unmount()
    }
  }
}

describe('useIsMobileViewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reflects the current viewport immediately on mount', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(createFakeMediaQueryList(true)))

    const { isMobile, unmount } = withIsMobileViewport()

    expect(isMobile.value).toBe(true)
    unmount()
  })

  it('defaults to false when matchMedia is unavailable (e.g. this test environment)', () => {
    expect(typeof window.matchMedia).not.toBe('function')

    const { isMobile, unmount } = withIsMobileViewport()

    expect(isMobile.value).toBe(false)
    unmount()
  })

  it('updates live as the viewport crosses the breakpoint', () => {
    const fakeQuery = createFakeMediaQueryList(false)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(fakeQuery))

    const { isMobile, unmount } = withIsMobileViewport()
    expect(isMobile.value).toBe(false)

    fakeQuery.simulateChange(true)
    expect(isMobile.value).toBe(true)

    fakeQuery.simulateChange(false)
    expect(isMobile.value).toBe(false)
    unmount()
  })

  it('stops updating after the component unmounts', () => {
    const fakeQuery = createFakeMediaQueryList(false)
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(fakeQuery))

    const { isMobile, unmount } = withIsMobileViewport()
    unmount()

    fakeQuery.simulateChange(true)
    expect(isMobile.value).toBe(false)
  })
})
