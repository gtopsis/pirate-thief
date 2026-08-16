import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BottomSheet from '@/components/BottomSheet.vue'

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

describe('BottomSheet', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts collapsed', () => {
    const wrapper = mount(BottomSheet, { props: { jobCountText: '3 jobs' } })

    const handle = wrapper.find('button')
    expect(handle.attributes('aria-expanded')).toBe('false')
  })

  it('cycles collapsed -> half -> full -> collapsed on tap (WCAG 2.5.7: non-drag path to every snap point)', async () => {
    const wrapper = mount(BottomSheet, { props: { jobCountText: '3 jobs' } })
    const handle = wrapper.find('button')

    // collapsed -> half
    await handle.trigger('click')
    expect(handle.attributes('aria-expanded')).toBe('true')
    expect(handle.attributes('aria-label')).toBe('Expand job list panel to full view')

    // half -> full
    await handle.trigger('click')
    expect(handle.attributes('aria-label')).toBe('Collapse job list panel')

    // full -> collapsed (a single tap from full always fully collapses)
    await handle.trigger('click')
    expect(handle.attributes('aria-expanded')).toBe('false')
    expect(handle.attributes('aria-label')).toBe('Expand job list panel')
  })

  it('exposes expand()/collapse() methods used by marker-click and other flows', async () => {
    const wrapper = mount(BottomSheet, { props: { jobCountText: '3 jobs' } })
    const vm = wrapper.vm as unknown as { expand: () => void; collapse: () => void }

    vm.expand()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('true')

    vm.collapse()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('false')
  })

  describe('slot content mounting (perf: avoid mounting the mobile job list on desktop)', () => {
    it('does not mount the slot content at all when not on a mobile viewport', async () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(createFakeMediaQueryList(false)))

      const wrapper = mount(BottomSheet, {
        props: { jobCountText: '3 jobs' },
        slots: { default: '<p class="slot-marker">panel content</p>' }
      })
      const vm = wrapper.vm as unknown as { expand: () => void }
      vm.expand()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.slot-marker').exists()).toBe(false)
    })

    it('mounts the slot content when on a mobile viewport', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(createFakeMediaQueryList(true)))

      const wrapper = mount(BottomSheet, {
        props: { jobCountText: '3 jobs' },
        slots: { default: '<p class="slot-marker">panel content</p>' }
      })

      expect(wrapper.find('.slot-marker').exists()).toBe(true)
    })

    it('mounts/unmounts the slot content live if the viewport crosses the breakpoint', async () => {
      const fakeQuery = createFakeMediaQueryList(false)
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(fakeQuery))

      const wrapper = mount(BottomSheet, {
        props: { jobCountText: '3 jobs' },
        slots: { default: '<p class="slot-marker">panel content</p>' }
      })
      expect(wrapper.find('.slot-marker').exists()).toBe(false)

      fakeQuery.simulateChange(true)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.slot-marker').exists()).toBe(true)

      fakeQuery.simulateChange(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.slot-marker').exists()).toBe(false)
    })
  })
})
