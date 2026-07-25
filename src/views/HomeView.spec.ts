import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import HomeView from '@/views/HomeView.vue'

const HEADER_ROWS = Array.from({ length: 5 }, () => ['', '', '', '', ''])

const JOB_ROWS = [
  ['Acme Corp', 'Senior Frontend Engineer', 'Athens', 'Frontend', 'https://example.com/job/1'],
  ['Beta Ltd', 'Backend Engineer', 'Thessaloniki', 'Backend', 'https://example.com/job/2'],
  ['Gamma Inc', 'DevOps Engineer', 'Remote', 'DevOps', 'https://example.com/job/3']
]

const mockSpreadsheetResponse = {
  majorDimension: 'ROWS',
  range: 'Jobs!A1:E100',
  values: [...HEADER_ROWS, ...JOB_ROWS]
}

describe('HomeView', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSpreadsheetResponse)
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('mounts without throwing, fetches jobs, and renders the map + job panel', async () => {
    const wrapper = mount(HomeView, {
      attachTo: document.body
    })

    await flushPromises()

    // Job data was fetched and parsed
    expect(window.fetch).toHaveBeenCalled()

    // Map container is present
    expect(wrapper.find('.app-shell').exists()).toBe(true)

    // Desktop side panel and mobile bottom sheet both render a job panel
    const jobArticles = wrapper.findAll('article')
    expect(jobArticles.length).toBeGreaterThan(0)

    // The fetched job titles appear somewhere in the rendered output
    expect(wrapper.text()).toContain('Senior Frontend Engineer')

    wrapper.unmount()
  })

  it('filters jobs by search query', async () => {
    const wrapper = mount(HomeView, { attachTo: document.body })
    await flushPromises()

    const searchInputs = wrapper.findAll('input[type="search"]')
    expect(searchInputs.length).toBeGreaterThan(0)

    await searchInputs[0]!.setValue('Backend')
    await flushPromises()

    expect(wrapper.text()).toContain('Backend Engineer')
    expect(wrapper.text()).not.toContain('Senior Frontend Engineer')

    wrapper.unmount()
  })
})
