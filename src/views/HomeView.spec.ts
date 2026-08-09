import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import HomeView from '@/views/HomeView.vue'
import JobsMap from '@/components/JobsMap.vue'

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
// Remote listing: has no city to plot, but is a legitimate location value
// (not a data error) -- shown as a nationwide map overlay instead.
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

/**
 * The list defaults to following the map's current viewport ("area"
 * focus). In jsdom, the map container has no real size, so Leaflet's
 * computed bounds are degenerate and exclude every job -- tests that care
 * about filter/search/notice behavior (not map-viewport math) opt out via
 * the "Sync list with map view" toggle first, same as a user unchecking
 * it to see every matching job regardless of pan/zoom.
 */
const showAllJobs = async (wrapper: VueWrapper): Promise<void> => {
  const toggle = wrapper.findAll('input[type="checkbox"]')[0]!
  await toggle.setValue(false)
  await flushPromises()
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
    await showAllJobs(wrapper)

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
    await showAllJobs(wrapper)

    const searchInput = wrapper.findAll('input[type="search"]')[0]!
    await searchInput.setValue('Backend')
    await flushPromises()

    expect(wrapper.text()).toContain('Backend Engineer')
    expect(wrapper.text()).not.toContain('Senior Frontend Engineer')
  })

  it("updates each filter pill's job count to reflect the search query, regardless of which pills are toggled", async () => {
    wrapper = await mountHomeView()
    await showAllJobs(wrapper)

    // Before searching: one job per tech area (Frontend/Backend/DevOps).
    expect(wrapper.text()).toContain('Frontend (1)')
    expect(wrapper.text()).toContain('Backend (1)')

    const searchInput = wrapper.findAll('input[type="search"]')[0]!
    await searchInput.setValue('Backend')
    await flushPromises()

    // Narrowing by search alone (no tech-area filter toggled) already
    // zeroes out Frontend's count and leaves Backend's untouched.
    expect(wrapper.text()).toContain('Frontend (0)')
    expect(wrapper.text()).toContain('Backend (1)')
  })

  it("updates each filter pill's job count to reflect the map's current viewport when synced to it", async () => {
    wrapper = await mountHomeView()
    // Default state: synced to the map view ('area' focus) -- do NOT call
    // showAllJobs(), since the whole point is verifying the map narrows
    // the counts while synced.

    const jobsMap = wrapper.findComponent(JobsMap)

    // Athens ~[37.98, 23.73]; Thessaloniki ~[40.64, 22.93] -- this range
    // encloses only Athens (Frontend job), excluding Backend (Thessaloniki).
    await jobsMap.vm.$emit('bounds-changed', { north: 38.5, south: 37.5, east: 24, west: 23 })
    await flushPromises()

    expect(wrapper.text()).toContain('Frontend (1)')
    expect(wrapper.text()).toContain('Backend (0)')

    // Panning to enclose both updates the counts live, without touching
    // search/filters at all.
    await jobsMap.vm.$emit('bounds-changed', { north: 41, south: 37, east: 24, west: 22 })
    await flushPromises()

    expect(wrapper.text()).toContain('Frontend (1)')
    expect(wrapper.text()).toContain('Backend (1)')
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

  it('requires Alt for the r/h keyboard shortcuts (WCAG 2.1.4: Character Key Shortcuts)', async () => {
    // jsdom can't actually render the heatmap (see the fallback test
    // above), so toggling it always logs and reverts -- used here purely
    // as a signal that the "h" shortcut actually ran toggleViewMode().
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    wrapper = await mountHomeView()

    const fetchCallsBefore = (window.fetch as ReturnType<typeof vi.fn>).mock.calls.length

    // A bare "h" (no modifier) must not toggle the heatmap view...
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }))
    await flushPromises()
    expect(consoleErrorSpy).not.toHaveBeenCalled()

    // ...but Alt+H does (and jsdom's lack of canvas support makes it log
    // and fall back, proving the toggle actually ran).
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', altKey: true }))
    await flushPromises()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Heatmap view is unavailable'),
      expect.anything()
    )

    // A bare "r" must not trigger a refresh...
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))
    await flushPromises()
    expect((window.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallsBefore)

    // ...but Alt+R does.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', altKey: true }))
    await flushPromises()
    expect((window.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
      fetchCallsBefore
    )
  })

  it('persists the map center/zoom in the URL', async () => {
    wrapper = await mountHomeView()

    const params = new URLSearchParams(window.location.search)
    expect(params.has('lat')).toBe(true)
    expect(params.has('lng')).toBe(true)
    expect(params.has('z')).toBe(true)
  })

  it('updates the job-count text live as the map is panned, while synced to the map view', async () => {
    wrapper = await mountHomeView()
    // Default state: synced to the map view ('area' focus) -- do NOT call
    // showAllJobs() here, since the whole point is to verify the count
    // reacts to panning while synced, not just to search/filters.

    const jobsMap = wrapper.findComponent(JobsMap)

    // Athens ~[37.98, 23.73]; Thessaloniki ~[40.64, 22.93] -- this range
    // encloses only Athens (Frontend job).
    await jobsMap.vm.$emit('bounds-changed', { north: 38.5, south: 37.5, east: 24, west: 23 })
    await flushPromises()
    expect(wrapper.text()).toContain('1 job')
    expect(wrapper.text()).not.toContain('2 jobs')

    // Panning to a wider view that also encloses Thessaloniki (Backend
    // job) updates the count live, without touching search/filters at all.
    await jobsMap.vm.$emit('bounds-changed', { north: 41, south: 37, east: 24, west: 22 })
    await flushPromises()
    expect(wrapper.text()).toContain('2 jobs')
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
    await showAllJobs(wrapper)

    // Only the unknown/typo'd location counts as unmappable -- REMOTE_JOB
    // is a legitimate remote listing, surfaced separately (see below).
    // This is plain, always-visible text (no expand/collapse) -- the
    // job's own list card (checked next) is what shows its details.
    expect(wrapper.text()).toContain("1 job couldn't be placed on the map")
    expect(wrapper.text()).toContain('Definitely Not A Known City')
  })

  it('surfaces remote jobs as a distinct nationwide overlay, not as an unmappable/error job', async () => {
    wrapper = await mountHomeView()

    // REMOTE_JOB (from DEFAULT_JOB_ROWS) is not counted as an error...
    expect(wrapper.text()).not.toContain("couldn't be placed on the map")
    // ...but is surfaced via its own notice instead.
    expect(wrapper.text()).toContain('1 remote job shown as a nationwide overlay on the map')
  })

  it('clicking a marker narrows the list to that location (point focus), revertible via its pill or by panning', async () => {
    wrapper = await mountHomeView()

    const jobsMap = wrapper.findComponent(JobsMap)
    const athensJob = {
      company: 'Acme Corp',
      title: 'Senior Frontend Engineer',
      location: 'Athens',
      techArea: 'Frontend',
      url: 'https://example.com/job/1'
    }

    await jobsMap.vm.$emit('marker-click', [athensJob])
    await flushPromises()

    // Narrowed to just the clicked location...
    expect(wrapper.text()).toContain('Senior Frontend Engineer')
    expect(wrapper.text()).not.toContain('Backend Engineer')
    // ...and surfaced as a removable pill in the active-filters bar.
    const locationPill = wrapper.find('[aria-label="Reset to the default map view"]')
    expect(locationPill.exists()).toBe(true)
    expect(locationPill.text()).toContain('Athens')

    // Clicking the pill reverts to the default (area) focus.
    await locationPill.trigger('click')
    await flushPromises()
    expect(wrapper.find('[aria-label="Reset to the default map view"]').exists()).toBe(false)

    // Re-select the location, then confirm panning the map also reverts it.
    await jobsMap.vm.$emit('marker-click', [athensJob])
    await flushPromises()
    expect(wrapper.find('[aria-label="Reset to the default map view"]').exists()).toBe(true)

    await jobsMap.vm.$emit('bounds-changed', { north: 41, south: 40, east: 23, west: 22 })
    await flushPromises()
    expect(wrapper.find('[aria-label="Reset to the default map view"]').exists()).toBe(false)
  })

  it('selecting a marker while sync is off has no effect until sync is turned back on', async () => {
    wrapper = await mountHomeView()
    await showAllJobs(wrapper) // sync off ("all jobs")

    const jobsMap = wrapper.findComponent(JobsMap)
    const athensJob = {
      company: 'Acme Corp',
      title: 'Senior Frontend Engineer',
      location: 'Athens',
      techArea: 'Frontend',
      url: 'https://example.com/job/1'
    }

    await jobsMap.vm.$emit('marker-click', [athensJob])
    await flushPromises()

    // Still shows every job -- the marker was remembered, but sync being
    // off means it doesn't narrow the list yet.
    expect(wrapper.text()).toContain('Senior Frontend Engineer')
    expect(wrapper.text()).toContain('Backend Engineer')

    // Re-enabling sync resumes exactly that marker's selection.
    const syncToggle = wrapper.findAll('input[type="checkbox"]')[0]!
    await syncToggle.setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('Senior Frontend Engineer')
    expect(wrapper.text()).not.toContain('Backend Engineer')
  })
})
