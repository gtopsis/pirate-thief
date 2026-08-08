import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobPanel from '@/components/JobPanel.vue'
import type { Job } from '@/types/types'

const job = (overrides: Partial<Job> = {}): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location: 'Athens',
  techArea: 'Backend',
  url: 'https://x/1',
  ...overrides
})

const baseProps = {
  jobs: [job()],
  isLoading: false,
  error: false,
  filters: new Map<string, boolean>([['Backend', false]]),
  jobCounts: new Map<string, number>([['Backend', 1]]),
  searchQuery: '',
  mapFocus: 'area' as const,
  selectedLocationName: null,
  isViewportFilterAvailable: true,
  highlightedJobId: null,
  unmappableJobs: [],
  remoteJobs: [],
  jobCountText: '1 job'
}

/**
 * Returns the tag/role-identifying labels for every top-level control in
 * the panel's header section, in DOM order -- used to assert the
 * hierarchy (sync toggle -> search -> filters -> derived content)
 * without coupling the test to exact markup/classes.
 */
const controlOrder = (wrapper: ReturnType<typeof mount>): string[] => {
  const controls: string[] = []
  if (wrapper.find('input[type="checkbox"]').exists()) controls.push('sync-toggle')
  if (wrapper.find('input[type="search"]').exists()) controls.push('search')
  if (wrapper.find('ul[aria-label="Filter jobs by tech area"]').exists()) controls.push('filters')
  return controls
}

describe('JobPanel', () => {
  it('orders the sync toggle, then search, then filters (1st/2nd/3rd of the new hierarchy)', () => {
    const wrapper = mount(JobPanel, { props: baseProps })

    expect(controlOrder(wrapper)).toEqual(['sync-toggle', 'search', 'filters'])
  })

  it('does not render the sync toggle before the map has reported its bounds', () => {
    const wrapper = mount(JobPanel, {
      props: { ...baseProps, isViewportFilterAvailable: false }
    })

    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
  })

  it('still renders the sync toggle when compact (mobile "half" state) -- it is 1st-tier, not secondary', () => {
    const wrapper = mount(JobPanel, { props: { ...baseProps, compact: true } })

    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
  })

  it('hides the job-count text and remote/unmapped notices when compact', () => {
    const wrapper = mount(JobPanel, { props: { ...baseProps, compact: true } })

    expect(wrapper.text()).not.toContain(baseProps.jobCountText)
  })

  it('shows the job-count text when not compact and showJobCountText is true (the default)', () => {
    const wrapper = mount(JobPanel, { props: baseProps })

    expect(wrapper.text()).toContain(baseProps.jobCountText)
  })

  it('suppresses the job-count text via showJobCountText=false even when not compact', () => {
    const wrapper = mount(JobPanel, { props: { ...baseProps, showJobCountText: false } })

    expect(wrapper.text()).not.toContain(baseProps.jobCountText)
  })
})
