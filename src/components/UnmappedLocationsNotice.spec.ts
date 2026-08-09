import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UnmappedLocationsNotice from '@/components/UnmappedLocationsNotice.vue'
import type { Job } from '@/types/types'

const job = (overrides: Partial<Job> = {}): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location: 'Definitely Not A Known City',
  techArea: 'Backend',
  url: 'https://x/1',
  ...overrides
})

describe('UnmappedLocationsNotice', () => {
  it('renders nothing when every job is mappable', () => {
    const wrapper = mount(UnmappedLocationsNotice, { props: { jobs: [] } })

    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('shows a pluralized count for more than one unmappable job', () => {
    const wrapper = mount(UnmappedLocationsNotice, { props: { jobs: [job(), job()] } })

    expect(wrapper.text()).toBe("2 jobs couldn't be placed on the map")
  })

  it('uses the singular word for exactly one unmappable job', () => {
    const wrapper = mount(UnmappedLocationsNotice, { props: { jobs: [job()] } })

    expect(wrapper.text()).toBe("1 job couldn't be placed on the map")
  })

  it('is plain, non-interactive text -- no button/expand affordance', () => {
    const wrapper = mount(UnmappedLocationsNotice, { props: { jobs: [job()] } })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
