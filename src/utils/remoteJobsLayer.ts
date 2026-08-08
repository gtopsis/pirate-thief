import L from 'leaflet'
import type { Geometry } from 'geojson'
import type { Job } from '@/types/types'
import { GREECE_CENTER, getJobId } from '@/utils/geo'
import { isMobileViewport } from '@/utils/viewport'
import greeceBoundary from '@/data/greece-boundary.json'

export interface RemoteJobsLayerCallbacks {
  /** Builds the popup HTML shown when the remote marker is clicked. */
  buildPopupContent: (jobs: Job[]) => string
  /** Called when the remote marker is clicked (mirrors city marker clicks). */
  onMarkerClick: (jobs: Job[]) => void
  /** Registers the remote marker under a job id, so flyToJob/highlight work for remote jobs too. */
  registerMarker: (jobId: string, marker: L.Marker) => void
}

/**
 * Manages the "remote jobs" map overlay: a translucent fill over the whole
 * of Greece (since "remote" means the job could be worked from anywhere in
 * the country, a single pin would be arbitrary) plus a fixed, clickable
 * marker at the country's center showing the count. The fill itself is
 * non-interactive so it never blocks clicks/pans on city pins underneath it.
 *
 * Kept as a single stateful unit so the map component only has to call
 * `update`/`clear` without owning the underlying Leaflet layer instances.
 */
export const createRemoteJobsLayer = (callbacks: RemoteJobsLayerCallbacks) => {
  let boundaryLayer: L.GeoJSON | null = null
  let marker: L.Marker | null = null

  const clear = (map: L.Map): void => {
    if (boundaryLayer) {
      map.removeLayer(boundaryLayer)
      boundaryLayer = null
    }
    if (marker) {
      map.removeLayer(marker)
      marker = null
    }
  }

  /**
   * Redraws the overlay for the given remote jobs. Pass `isVisible: false`
   * to hide it without needing the caller to track visibility separately
   * (e.g. while in heatmap view, where a translucent fill would visually
   * compete with the heatmap's own color scale).
   */
  const update = (map: L.Map, remoteJobs: readonly Job[], isVisible: boolean): void => {
    clear(map)
    if (!isVisible || remoteJobs.length === 0) return

    boundaryLayer = L.geoJSON(greeceBoundary as Geometry, {
      interactive: false,
      style: {
        fillColor: '#8b5cf6',
        fillOpacity: 0.12,
        color: '#8b5cf6',
        weight: 1,
        opacity: 0.35
      }
    }).addTo(map)

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-pin marker-pin-remote">${remoteJobs.length}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    })

    marker = L.marker(GREECE_CENTER, { icon, zIndexOffset: 1000 })
    // See markerClusterLayer.ts's identical comment: on mobile the
    // bottom sheet already shows the same jobs in a roomier view once
    // onMarkerClick fires, so a popup would just be a redundant overlay.
    if (!isMobileViewport()) {
      marker.bindPopup(callbacks.buildPopupContent([...remoteJobs]))
    }
    marker.on('click', () => callbacks.onMarkerClick([...remoteJobs]))
    marker.addTo(map)

    for (const job of remoteJobs) {
      callbacks.registerMarker(getJobId(job), marker)
    }
  }

  return { update, clear }
}
