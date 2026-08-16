import { describe, it, expect, vi, afterEach } from 'vitest'
import L from 'leaflet'
import { createRemoteJobsLayer } from '@/utils/remoteJobsLayer'
import type { Job } from '@/types/types'

const remoteJob = (url: string): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location: 'Remote',
  techArea: 'Backend',
  url
})

const noopCallbacks = {
  buildPopupContent: () => '',
  onMarkerClick: () => {},
  registerMarker: () => {}
}

describe('createRemoteJobsLayer', () => {
  let map: L.Map | undefined

  afterEach(() => {
    map?.remove()
    map = undefined
    vi.restoreAllMocks()
  })

  const createTestMap = (): L.Map => {
    const container = document.createElement('div')
    // Leaflet needs a definite size to initialize without warnings.
    container.style.width = '400px'
    container.style.height = '400px'
    document.body.appendChild(container)
    return L.map(container, { center: [39, 22], zoom: 6 })
  }

  it('only builds the country-boundary polygon once, across many updates', () => {
    map = createTestMap()
    const geoJsonSpy = vi.spyOn(L, 'geoJSON')
    const layer = createRemoteJobsLayer(noopCallbacks)

    layer.update(map, [remoteJob('https://x/1')], true)
    layer.update(map, [remoteJob('https://x/1'), remoteJob('https://x/2')], true)
    layer.update(map, [remoteJob('https://x/1')], true)

    expect(geoJsonSpy).toHaveBeenCalledTimes(1)
  })

  it('re-attaches the same boundary layer instance after being hidden and shown again', () => {
    map = createTestMap()
    const geoJsonSpy = vi.spyOn(L, 'geoJSON')
    const layer = createRemoteJobsLayer(noopCallbacks)

    layer.update(map, [remoteJob('https://x/1')], true)
    layer.update(map, [remoteJob('https://x/1')], false) // e.g. switched to heatmap view
    layer.update(map, [remoteJob('https://x/1')], true) // switched back

    expect(geoJsonSpy).toHaveBeenCalledTimes(1)
  })

  it('hides the overlay when there are no remote jobs, without erroring, and can show it again later', () => {
    map = createTestMap()
    const geoJsonSpy = vi.spyOn(L, 'geoJSON')
    const layer = createRemoteJobsLayer(noopCallbacks)

    layer.update(map, [remoteJob('https://x/1')], true)
    layer.update(map, [], true) // would throw if this broke instead of just hiding

    // Showing it again afterwards still works, and still doesn't rebuild
    // the boundary polygon a second time.
    layer.update(map, [remoteJob('https://x/1')], true)
    expect(geoJsonSpy).toHaveBeenCalledTimes(1)
  })
})
