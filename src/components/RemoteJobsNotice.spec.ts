import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RemoteJobsNotice from '@/components/RemoteJobsNotice.vue'
import type { Job } from '@/types/types'

const job = (overrides: Partial<Job> = {}): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location: 'Remote',
  techArea: 'Backend',
  url: 'https://x/1',
  ...overrides
})

describe('RemoteJobsNotice', () => {
  it('renders nothing when there are no remote jobs', () => {
    const wrapper = mount(RemoteJobsNotice, { props: { jobs: [] } })

    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('shows a pluralized count for more than one remote job', () => {
    const wrapper = mount(RemoteJobsNotice, { props: { jobs: [job(), job()] } })

    expect(wrapper.text()).toBe('2 remote jobs shown as a nationwide overlay on the map')
  })

  it('uses the singular word for exactly one remote job', () => {
    const wrapper = mount(RemoteJobsNotice, { props: { jobs: [job()] } })

    expect(wrapper.text()).toBe('1 remote job shown as a nationwide overlay on the map')
  })

  it('is plain, non-interactive text -- no button/expand affordance', () => {
    const wrapper = mount(RemoteJobsNotice, { props: { jobs: [job()] } })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
