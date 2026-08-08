import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActiveFiltersBar from '@/components/ActiveFiltersBar.vue'

const baseProps = {
  filters: new Map<string, boolean>([
    ['Frontend', false],
    ['Backend', false]
  ]),
  searchQuery: '',
  mapFocus: 'area' as const,
  selectedLocationName: null
}

describe('ActiveFiltersBar', () => {
  it('renders nothing when nothing is active (default area focus, no search/filters)', () => {
    const wrapper = mount(ActiveFiltersBar, { props: baseProps })

    expect(wrapper.find('[role="group"]').exists()).toBe(false)
  })

  // Search query and tech-area filters already have their own visible,
  // clickable UI elsewhere (the search input; FilterList's chips) -- this
  // bar intentionally does NOT duplicate them, only Map Focus (which has
  // no other visible indicator) and a single "Clear all" reset.
  it('shows only the "Clear all" action (no pill) when just search or a filter is active', () => {
    const wrapper = mount(ActiveFiltersBar, {
      props: { ...baseProps, searchQuery: 'engineer' }
    })

    expect(wrapper.find('[role="group"]').exists()).toBe(true)
    expect(wrapper.findAll('button')).toHaveLength(1)
    expect(wrapper.find('button').text()).toBe('Clear all')
  })

  it('does not render a map-focus pill for the default "area" focus', () => {
    const wrapper = mount(ActiveFiltersBar, { props: { ...baseProps, mapFocus: 'area' } })

    expect(wrapper.find('[aria-label="Reset to the default map view"]').exists()).toBe(false)
  })

  it('renders a location pill for "point" focus and emits clear-map-focus', async () => {
    const wrapper = mount(ActiveFiltersBar, {
      props: { ...baseProps, mapFocus: 'point', selectedLocationName: 'Athens' }
    })

    const pill = wrapper.find('[aria-label="Reset to the default map view"]')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toContain('Athens')

    await pill.trigger('click')
    expect(wrapper.emitted('clear-map-focus')).toHaveLength(1)
  })

  it('renders an "all jobs" pill for "all" focus', () => {
    const wrapper = mount(ActiveFiltersBar, { props: { ...baseProps, mapFocus: 'all' } })

    expect(wrapper.find('[aria-label="Reset to the default map view"]').text()).toContain(
      'All jobs'
    )
  })

  it('shows a single "Clear all" action that emits clear-all', async () => {
    const wrapper = mount(ActiveFiltersBar, {
      props: { ...baseProps, searchQuery: 'engineer' }
    })

    const clearAll = wrapper.findAll('button').find((button) => button.text() === 'Clear all')
    expect(clearAll).toBeDefined()

    await clearAll!.trigger('click')
    expect(wrapper.emitted('clear-all')).toHaveLength(1)
  })
})
