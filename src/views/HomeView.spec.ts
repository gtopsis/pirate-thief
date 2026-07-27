import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import HomeView from '@/views/HomeView.vue'

const HEADER_ROWS = Array.from({ length: 5 }, () => ['', '', '', '', ''])

// Job rows are [company, title, location, techArea, url].
const FRONTEND_JOB = [
  'Acme Corp',
  'Senior Frontend Engineer',
  'Athens',
  'Frontend',
  'https://example.com/job/1'
]
const BACKEND_JOB = [
  'Beta Ltd',
  'Backend Engineer',
  'Thessaloniki',
  'Backend',
  'https://example.com/job/2'
]
// Legitimately unmappable: a fully-remote role has no city to plot.
const REMOTE_JOB = ['Gamma Inc', 'DevOps Engineer', 'Remote', 'DevOps', 'https://example.com/job/3']

const DEFAULT_JOB_ROWS = [FRONTEND_JOB, BACKEND_JOB, REMOTE_JOB]

/** Stubs `fetch` to resolve with a spreadsheet response containing the given job rows. */
const stubJobsResponse = (jobRows: string[][]): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          majorDimension: 'ROWS',
          range: 'Jobs!A1:E100',
          values: [...HEADER_ROWS, ...jobRows]
        })
    })
  )
}

/** Mounts HomeView and waits for the initial job fetch to settle. */
const mountHomeView = async (): Promise<VueWrapper> => {
  const wrapper = mount(HomeView, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('HomeView', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    stubJobsResponse(DEFAULT_JOB_ROWS)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
  })

  it('mounts without throwing, fetches jobs, and renders the map + job panel', async () => {
    wrapper = await mountHomeView()

    // Job data was fetched and parsed
    expect(window.fetch).toHaveBeenCalled()

    // Map container is present
    expect(wrapper.find('.app-shell').exists()).toBe(true)

    // Desktop side panel and mobile bottom sheet both render a job panel
    expect(wrapper.findAll('article').length).toBeGreaterThan(0)

    // The fetched job titles appear somewhere in the rendered output
    expect(wrapper.text()).toContain('Senior Frontend Engineer')
  })

  it('filters jobs by search query', async () => {
    wrapper = await mountHomeView()

    const searchInput = wrapper.findAll('input[type="search"]')[0]!
    await searchInput.setValue('Backend')
    await flushPromises()

    expect(wrapper.text()).toContain('Backend Engineer')
    expect(wrapper.text()).not.toContain('Senior Frontend Engineer')
  })

  it('gracefully falls back to markers view if heatmap rendering is unavailable', async () => {
    // jsdom doesn't implement canvas 2D contexts, so leaflet.heat can't
    // actually render. This verifies the app degrades gracefully (no
    // crash, button stays reflecting marker view) instead of relying on
    // canvas support being present.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    wrapper = await mountHomeView()

    const toggle = wrapper.find('.map-view-toggle')
    expect(toggle.text()).toBe('Heatmap')

    await toggle.trigger('click')

    // Falls back to markers view rather than crashing
    expect(toggle.text()).toBe('Heatmap')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Heatmap view is unavailable'),
      expect.anything()
    )
  })

  it('persists the map center/zoom in the URL', async () => {
    wrapper = await mountHomeView()

    const params = new URLSearchParams(window.location.search)
    expect(params.has('lat')).toBe(true)
    expect(params.has('lng')).toBe(true)
    expect(params.has('z')).toBe(true)
  })

  it('surfaces jobs whose location could not be placed on the map', async () => {
    const unmappableJob = [
      'Delta LLC',
      'QA Engineer',
      'Definitely Not A Known City',
      'QA',
      'https://example.com/job/4'
    ]
    stubJobsResponse([...DEFAULT_JOB_ROWS, unmappableJob])

    wrapper = await mountHomeView()

    // REMOTE_JOB and the unknown/typo'd location are both unmappable, so
    // the notice should report 2 jobs.
    expect(wrapper.text()).toContain("2 jobs couldn't be placed on the map")

    const notice = wrapper.find('button[aria-expanded]')
    expect(notice.attributes('aria-expanded')).toBe('false')

    await notice.trigger('click')

    expect(notice.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('Definitely Not A Known City')
  })
})
