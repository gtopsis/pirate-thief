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

  it('defaults to showing all matching jobs regardless of viewport', () => {
    const filteredJobList = ref<Job[]>([
      jobAt('Athens', 'https://x/1'),
      jobAt('Thessaloniki', 'https://x/2')
    ])
    const { panelJobList, showAllOnMap, isViewportFilterAvailable } = useMapView(filteredJobList)

    expect(showAllOnMap.value).toBe(true)
    expect(isViewportFilterAvailable.value).toBe(false)
    expect(panelJobList.value).toHaveLength(2)
  })

  it('narrows panelJobList to the current bounds once showAllOnMap is disabled', () => {
    const filteredJobList = ref<Job[]>([
      jobAt('Athens', 'https://x/1'),
      jobAt('Thessaloniki', 'https://x/2')
    ])
    const { panelJobList, showAllOnMap, handleBoundsChanged, isViewportFilterAvailable } =
      useMapView(filteredJobList)

    // A viewport roughly around Athens only.
    handleBoundsChanged({ north: 38.1, south: 37.9, east: 23.8, west: 23.6 })
    expect(isViewportFilterAvailable.value).toBe(true)

    showAllOnMap.value = false

    expect(panelJobList.value.map((job) => job.location)).toEqual(['Athens'])
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
