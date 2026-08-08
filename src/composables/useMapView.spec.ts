import { describe, it, expect, afterEach } from 'vitest'
import { ref } from 'vue'
import { useMapView } from '@/composables/useMapView'
import type { Job } from '@/types/types'

const jobAt = (location: string, url: string): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location,
  techArea: 'Backend',
  url
})

describe('useMapView', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('defaults to "area" focus, but shows every job until a viewport is known', () => {
    const filteredJobList = ref<Job[]>([
      jobAt('Athens', 'https://x/1'),
      jobAt('Thessaloniki', 'https://x/2')
    ])
    const { panelJobList, mapFocus, isViewportFilterAvailable } = useMapView(filteredJobList)

    expect(mapFocus.value).toBe('area')
    expect(isViewportFilterAvailable.value).toBe(false)
    // filterJobsByBounds returns everything when bounds are still null.
    expect(panelJobList.value).toHaveLength(2)
  })

  it('narrows panelJobList to the current viewport once bounds are known', () => {
    const filteredJobList = ref<Job[]>([
      jobAt('Athens', 'https://x/1'),
      jobAt('Thessaloniki', 'https://x/2')
    ])
    const { panelJobList, handleBoundsChanged, isViewportFilterAvailable } =
      useMapView(filteredJobList)

    // A viewport roughly around Athens only.
    handleBoundsChanged({ north: 38.1, south: 37.9, east: 23.8, west: 23.6 })

    expect(isViewportFilterAvailable.value).toBe(true)
    expect(panelJobList.value.map((job) => job.location)).toEqual(['Athens'])
  })

  it('showAllJobs shows every matching job regardless of the viewport', () => {
    const filteredJobList = ref<Job[]>([
      jobAt('Athens', 'https://x/1'),
      jobAt('Thessaloniki', 'https://x/2')
    ])
    const { panelJobList, mapFocus, handleBoundsChanged, showAllJobs } = useMapView(filteredJobList)

    handleBoundsChanged({ north: 38.1, south: 37.9, east: 23.8, west: 23.6 })
    showAllJobs()

    expect(mapFocus.value).toBe('all')
    expect(panelJobList.value).toHaveLength(2)
  })

  it('selectLocation narrows the list to exactly the given jobs (point focus)', () => {
    const filteredJobList = ref<Job[]>([
      jobAt('Athens', 'https://x/1'),
      jobAt('Thessaloniki', 'https://x/2')
    ])
    const athensJobs = [filteredJobList.value[0]!]
    const { panelJobList, mapFocus, selectedLocationName, selectLocation } =
      useMapView(filteredJobList)

    selectLocation(athensJobs)

    expect(mapFocus.value).toBe('point')
    expect(selectedLocationName.value).toBe('Athens')
    expect(panelJobList.value).toEqual(athensJobs)
  })

  it('reverts point focus back to area as soon as the map moves', () => {
    const filteredJobList = ref<Job[]>([
      jobAt('Athens', 'https://x/1'),
      jobAt('Thessaloniki', 'https://x/2')
    ])
    const { mapFocus, selectedLocationName, selectLocation, handleBoundsChanged } =
      useMapView(filteredJobList)

    selectLocation([filteredJobList.value[0]!])
    expect(mapFocus.value).toBe('point')

    handleBoundsChanged({ north: 41, south: 40, east: 23, west: 22 })

    expect(mapFocus.value).toBe('area')
    expect(selectedLocationName.value).toBeNull()
  })

  it('followMapArea resets from point or all back to the default area focus', () => {
    const filteredJobList = ref<Job[]>([jobAt('Athens', 'https://x/1')])
    const { mapFocus, selectLocation, followMapArea } = useMapView(filteredJobList)

    selectLocation(filteredJobList.value)
    expect(mapFocus.value).toBe('point')

    followMapArea()
    expect(mapFocus.value).toBe('area')
  })

  it('persists the map view to the URL on handleViewChanged', () => {
    const { handleViewChanged } = useMapView(ref<Job[]>([]))

    handleViewChanged({ lat: 39.0742, lng: 21.8243, zoom: 7 })

    const params = new URLSearchParams(window.location.search)
    expect(params.get('lat')).toBe('39.0742')
    expect(params.get('lng')).toBe('21.8243')
    expect(params.get('z')).toBe('7')
  })

  it('reads a persisted initial view from the URL at construction time', () => {
    window.history.replaceState({}, '', '/?lat=38.0000&lng=23.0000&z=10')

    const { initialMapView } = useMapView(ref<Job[]>([]))

    expect(initialMapView).toEqual({ lat: 38, lng: 23, zoom: 10 })
  })

  it('returns a null initial view when the URL has no persisted view', () => {
    const { initialMapView } = useMapView(ref<Job[]>([]))

    expect(initialMapView).toBeNull()
  })
})
