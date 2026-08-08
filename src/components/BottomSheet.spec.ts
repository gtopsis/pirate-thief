import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BottomSheet from '@/components/BottomSheet.vue'

describe('BottomSheet', () => {
  it('starts collapsed', () => {
    const wrapper = mount(BottomSheet, { props: { jobCount: 3 } })

    const handle = wrapper.find('button')
    expect(handle.attributes('aria-expanded')).toBe('false')
  })

  it('cycles collapsed -> half -> full -> collapsed on tap (WCAG 2.5.7: non-drag path to every snap point)', async () => {
    const wrapper = mount(BottomSheet, { props: { jobCount: 3 } })
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
    const wrapper = mount(BottomSheet, { props: { jobCount: 3 } })
    const vm = wrapper.vm as unknown as { expand: () => void; collapse: () => void }

    vm.expand()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('true')

    vm.collapse()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('false')
  })
})
