import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import L from 'leaflet'
import JobsMap from '@/components/JobsMap.vue'
import type { Job } from '@/types/types'

const jobAt = (location: string, url: string): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location,
  techArea: 'Backend',
  url
})

const ATHENS_JOB = jobAt('Athens', 'https://x/1')
const THESSALONIKI_JOB = jobAt('Thessaloniki', 'https://x/2')

// Matches JobsMap.vue's JOBS_CHANGE_DEBOUNCE_MS: the jobs/remoteJobs watcher
// debounces its (expensive) map rebuild, so tests that change `jobs` via
// `setProps` need to wait this long afterwards to see its effect.
const awaitJobsChangeDebounce = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 250))

describe('JobsMap', () => {
  let wrapper: VueWrapper | undefined

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.restoreAllMocks()
  })

  it('fits the viewport to the initial jobs exactly once, not again on every subsequent jobs change', async () => {
    const fitBoundsSpy = vi.spyOn(L.Map.prototype, 'fitBounds')

    wrapper = mount(JobsMap, {
      props: { jobs: [ATHENS_JOB, THESSALONIKI_JOB] },
      attachTo: document.body
    })
    await wrapper.vm.$nextTick()

    expect(fitBoundsSpy).toHaveBeenCalledTimes(1)

    // Simulates what happens when the user toggles a tech-area filter or
    // types a search query while synced to the map: `jobs` narrows, but
    // the viewport must NOT reset/zoom out because of it.
    await wrapper.setProps({ jobs: [ATHENS_JOB] })
    await awaitJobsChangeDebounce()

    expect(fitBoundsSpy).toHaveBeenCalledTimes(1)

    // Narrowing further (e.g. a search query matching nothing) must not
    // trigger a fit either.
    await wrapper.setProps({ jobs: [] })
    await awaitJobsChangeDebounce()

    expect(fitBoundsSpy).toHaveBeenCalledTimes(1)
  })

  it('never auto-fits when a persisted initial view is provided', async () => {
    const fitBoundsSpy = vi.spyOn(L.Map.prototype, 'fitBounds')

    wrapper = mount(JobsMap, {
      props: {
        jobs: [ATHENS_JOB, THESSALONIKI_JOB],
        initialView: { lat: 38, lng: 23, zoom: 10 }
      },
      attachTo: document.body
    })
    await wrapper.vm.$nextTick()

    expect(fitBoundsSpy).not.toHaveBeenCalled()

    await wrapper.setProps({ jobs: [ATHENS_JOB] })
    await awaitJobsChangeDebounce()

    expect(fitBoundsSpy).not.toHaveBeenCalled()
  })
})
