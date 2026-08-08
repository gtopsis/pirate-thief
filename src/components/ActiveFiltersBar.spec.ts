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

  it('renders a pill for an active search query and emits clear-search', async () => {
    const wrapper = mount(ActiveFiltersBar, {
      props: { ...baseProps, searchQuery: 'engineer' }
    })

    const pill = wrapper.find('[aria-label="Clear search: engineer"]')
    expect(pill.exists()).toBe(true)
    expect(pill.text()).toContain('engineer')

    await pill.trigger('click')
    expect(wrapper.emitted('clear-search')).toHaveLength(1)
  })

  it('renders a pill per active tech-area filter and emits clear-filter with its name', async () => {
    const wrapper = mount(ActiveFiltersBar, {
      props: {
        ...baseProps,
        filters: new Map([
          ['Frontend', true],
          ['Backend', false]
        ])
      }
    })

    const pill = wrapper.find('[aria-label="Clear filter: Frontend"]')
    expect(pill.exists()).toBe(true)

    await pill.trigger('click')
    expect(wrapper.emitted('clear-filter')).toEqual([['Frontend']])
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
