import L from 'leaflet'
import type { Job } from '@/types/types'
import { getJobCoords, getJobId } from '@/utils/geo'
import { bindPopupUnlessMobile } from '@/utils/leafletPopup'

export interface MarkerClusterLayerCallbacks {
  /** Builds the popup HTML shown when a marker (one or more jobs) is clicked. */
  buildPopupContent: (jobs: Job[]) => string
  /** Called when a marker is clicked. */
  onMarkerClick: (jobs: Job[]) => void
  /** Registers a marker under a job id, so flyToJob/highlight can look it up later. */
  registerMarker: (jobId: string, marker: L.Marker) => void
}

// Each city marker carries the number of jobs it represents, so a cluster
// (which merges several nearby city markers into one bubble at lower zoom
// levels) can sum them up -- keeping the number on a bubble consistent
// with what a single pin shows (a job count, not a location count).
interface JobCountMarker extends L.Marker {
  jobCount: number
}

const totalJobCount = (cluster: L.MarkerCluster): number =>
  cluster.getAllChildMarkers().reduce((sum, marker) => sum + (marker as JobCountMarker).jobCount, 0)

const clusterIconClass = (count: number): string => {
  if (count >= 30) return 'marker-cluster-large'
  if (count >= 10) return 'marker-cluster-medium'
  return 'marker-cluster-small'
}

const createClusterIcon = (cluster: L.MarkerCluster): L.DivIcon => {
  const count = totalJobCount(cluster)
  return L.divIcon({
    html: `<div class="marker-cluster-inner ${clusterIconClass(count)}"><span>${count}</span></div>`,
    className: 'marker-cluster-custom',
    iconSize: L.point(40, 40)
  })
}

/**
 * Manages the clustered city-marker layer: groups jobs by resolved
 * coordinate into one pin per unique location (with a popup listing every
 * job there), and clusters nearby pins together as the map zooms out.
 * Both a single pin and a cluster bubble show a job count -- clustering
 * only changes *how many locations* are represented by one bubble, not
 * what the number on it means.
 *
 * Kept as a single stateful unit so the map component only has to call
 * `update`/`attachTo`/`detachFrom`/`fitBounds` without owning the
 * underlying Leaflet cluster group instance.
 */
export const createMarkerClusterLayer = (callbacks: MarkerClusterLayerCallbacks) => {
  const clusterGroup = L.markerClusterGroup({
    iconCreateFunction: createClusterIcon,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 50
  })

  const update = (jobs: readonly Job[]): void => {
    clusterGroup.clearLayers()

    const coordsGroups = new Map<string, { lat: number; lng: number; jobs: Job[] }>()

    for (const job of jobs) {
      const coords = getJobCoords(job)
      if (!coords) continue

      const key = `${coords[0]},${coords[1]}`
      const group = coordsGroups.get(key)
      if (group) {
        group.jobs.push(job)
      } else {
        coordsGroups.set(key, { lat: coords[0], lng: coords[1], jobs: [job] })
      }
    }

    for (const { lat, lng, jobs: groupedJobs } of coordsGroups.values()) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pin">${groupedJobs.length}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
      })

      const marker = L.marker([lat, lng], { icon }) as JobCountMarker
      marker.jobCount = groupedJobs.length
      bindPopupUnlessMobile(marker, () => callbacks.buildPopupContent(groupedJobs))
      marker.on('click', () => callbacks.onMarkerClick(groupedJobs))

      for (const job of groupedJobs) {
        callbacks.registerMarker(getJobId(job), marker)
      }

      clusterGroup.addLayer(marker)
    }
  }

  const attachTo = (map: L.Map): void => {
    if (!map.hasLayer(clusterGroup)) map.addLayer(clusterGroup)
  }

  const detachFrom = (map: L.Map): void => {
    if (map.hasLayer(clusterGroup)) map.removeLayer(clusterGroup)
  }

  const fitBounds = (map: L.Map): void => {
    if (clusterGroup.getLayers().length === 0) return
    map.fitBounds(clusterGroup.getBounds(), { padding: [30, 30], maxZoom: 12 })
  }

  return { update, attachTo, detachFrom, fitBounds }
}
