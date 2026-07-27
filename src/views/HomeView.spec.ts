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
    window.history.replaceState({}, '', '/')
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

  it('gracefully falls back to markers view if heatmap rendering is unavailable', async () => {
    // jsdom doesn't implement canvas 2D contexts, so leaflet.heat can't
    // actually render. This verifies the app degrades gracefully (no
    // crash, button stays reflecting marker view) instead of relying on
    // canvas support being present.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mount(HomeView, { attachTo: document.body })
    await flushPromises()

    const toggle = wrapper.find('.map-view-toggle')
    expect(toggle.exists()).toBe(true)
    expect(toggle.text()).toBe('Heatmap')

    await toggle.trigger('click')

    // Falls back to markers view rather than crashing
    expect(toggle.text()).toBe('Heatmap')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Heatmap view is unavailable'),
      expect.anything()
    )

    wrapper.unmount()
  })

  it('persists the map center/zoom in the URL', async () => {
    const wrapper = mount(HomeView, { attachTo: document.body })
    await flushPromises()

    const params = new URLSearchParams(window.location.search)
    expect(params.has('lat')).toBe(true)
    expect(params.has('lng')).toBe(true)
    expect(params.has('z')).toBe(true)

    wrapper.unmount()
  })

  it('surfaces jobs whose location could not be placed on the map', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            ...mockSpreadsheetResponse,
            values: [
              ...HEADER_ROWS,
              ...JOB_ROWS,
              [
                'Delta LLC',
                'QA Engineer',
                'Definitely Not A Known City',
                'QA',
                'https://example.com/job/4'
              ]
            ]
          })
      })
    )

    const wrapper = mount(HomeView, { attachTo: document.body })
    await flushPromises()

    // "Remote" (from the base mock data) and the unknown/typo'd location
    // are both unmappable, so the notice should report 2 jobs.
    expect(wrapper.text()).toContain("2 jobs couldn't be placed on the map")

    const notice = wrapper.find('button[aria-expanded]')
    expect(notice.exists()).toBe(true)
    expect(notice.attributes('aria-expanded')).toBe('false')

    await notice.trigger('click')

    expect(notice.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Definitely Not A Known City')

    wrapper.unmount()
  })
})
