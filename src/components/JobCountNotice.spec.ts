import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobCountNotice from '@/components/JobCountNotice.vue'
import type { Job } from '@/types/types'

const job = (overrides: Partial<Job> = {}): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location: 'Remote',
  techArea: 'Backend',
  url: 'https://x/1',
  ...overrides
})

const remoteMessage = (count: number, jobWord: string): string =>
  `${count} remote ${jobWord} shown as a nationwide overlay on the map`

const unmappableMessage = (count: number, jobWord: string): string =>
  `${count} ${jobWord} couldn't be placed on the map`

describe('JobCountNotice', () => {
  it('renders nothing when there are no jobs', () => {
    const wrapper = mount(JobCountNotice, { props: { jobs: [], message: remoteMessage } })

    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('is plain, non-interactive text -- no button/expand affordance', () => {
    const wrapper = mount(JobCountNotice, { props: { jobs: [job()], message: remoteMessage } })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  describe('as used for remote jobs', () => {
    it('shows a pluralized count for more than one remote job', () => {
      const wrapper = mount(JobCountNotice, {
        props: { jobs: [job(), job()], message: remoteMessage }
      })

      expect(wrapper.text()).toBe('2 remote jobs shown as a nationwide overlay on the map')
    })

    it('uses the singular word for exactly one remote job', () => {
      const wrapper = mount(JobCountNotice, { props: { jobs: [job()], message: remoteMessage } })

      expect(wrapper.text()).toBe('1 remote job shown as a nationwide overlay on the map')
    })
  })

  describe('as used for unmappable jobs', () => {
    it('shows a pluralized count for more than one unmappable job', () => {
      const wrapper = mount(JobCountNotice, {
        props: { jobs: [job(), job()], message: unmappableMessage }
      })

      expect(wrapper.text()).toBe("2 jobs couldn't be placed on the map")
    })

    it('uses the singular word for exactly one unmappable job', () => {
      const wrapper = mount(JobCountNotice, {
        props: { jobs: [job()], message: unmappableMessage }
      })

      expect(wrapper.text()).toBe("1 job couldn't be placed on the map")
    })
  })
})
