import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobListItem from '@/components/JobListItem.vue'

const baseProps = {
  title: 'Senior Frontend Engineer',
  url: 'https://example.com/job/1',
  jobArea: 'Frontend',
  location: 'Kifisia, Attica, Greece',
  company: 'Acme Corp'
}

describe('JobListItem', () => {
  it('renders the company and location with a full-text tooltip', () => {
    const wrapper = mount(JobListItem, { props: baseProps })

    const line = wrapper.find('p')
    expect(line.text()).toContain('Acme Corp')
    expect(line.text()).toContain('Kifisia, Attica, Greece')
    expect(line.attributes('title')).toBe('Acme Corp — Kifisia, Attica, Greece')
    expect(line.classes()).toContain('truncate')
  })

  it('does not render a "Remote" badge for a geo-located job', () => {
    const wrapper = mount(JobListItem, { props: baseProps })

    expect(wrapper.text()).not.toContain('Remote')
  })

  it('renders a "Remote" badge instead of the raw location for remote jobs', () => {
    const wrapper = mount(JobListItem, { props: { ...baseProps, location: 'Remote' } })

    const line = wrapper.find('p')
    expect(line.text()).toContain('Remote')
    // The raw "Remote" location string is replaced by the badge, not appended as plain text.
    expect(line.text()).not.toContain('·')
  })

  it('emits select when the card is clicked', async () => {
    const wrapper = mount(JobListItem, { props: baseProps })

    await wrapper.find('article').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})
