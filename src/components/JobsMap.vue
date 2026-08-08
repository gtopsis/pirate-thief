<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.heat'
import type { Job } from '@/types/types'
import { GREECE_CENTER, GREECE_DEFAULT_ZOOM } from '@/utils/geo'
import type { MapBounds } from '@/utils/geo'
import { createRemoteJobsLayer } from '@/utils/remoteJobsLayer'
import { createMarkerClusterLayer } from '@/utils/markerClusterLayer'
import { createHeatmapLayer } from '@/utils/heatmapLayer'
import { createDarkModeTileLayer } from '@/utils/darkModeTiles'

export interface MapView {
  lat: number
  lng: number
  zoom: number
}

const props = defineProps<{
  jobs: readonly Job[]
  remoteJobs?: readonly Job[]
  highlightedJobId?: string | null
  initialView?: MapView | null
}>()

const emit = defineEmits<{
  (e: 'bounds-changed', bounds: MapBounds): void
  (e: 'marker-click', jobs: Job[]): void
  (e: 'view-changed', view: MapView): void
}>()

let map: L.Map | null = null
let markersByJobId = new Map<string, L.Marker>()
let resizeObserver: ResizeObserver | null = null
let stopDarkModeListener: (() => void) | null = null
const mapContainer = ref<HTMLDivElement | null>(null)
type ViewMode = 'markers' | 'heatmap'
const viewMode = ref<ViewMode>('markers')

const buildPopupContent = (jobs: Job[]): string => {
  if (jobs.length === 1) {
    const { title, company, location } = jobs[0]!
    return `<strong>${title}</strong><br>${company}<br><em>${location}</em>`
  }

  const scrollable = jobs.length > 15 ? ' scrollable' : ''
  const items = jobs.map((job) => `${job.company} - ${job.title}`).join('<br>')
  return `<strong>${jobs.length} jobs</strong><div class="jobs-list${scrollable}">${items}</div>`
}

const registerMarker = (jobId: string, marker: L.Marker): void => {
  markersByJobId.set(jobId, marker)
}

// Each factory below owns one Leaflet layer's lifecycle (creation,
// updates, attach/detach) so this component only has to orchestrate
// *when* each layer is shown/refreshed, not *how*. All three share
// `markersByJobId` (reset once per job-list change in refreshJobLayers,
// then repopulated via registerMarker) so flyToJob/highlight work
// uniformly across city markers and the remote-jobs marker.
const markerClusterLayer = createMarkerClusterLayer({
  buildPopupContent,
  onMarkerClick: (jobs) => emit('marker-click', jobs),
  registerMarker
})

const heatmapLayer = createHeatmapLayer()

const darkModeTileLayer = createDarkModeTileLayer()

const remoteJobsLayer = createRemoteJobsLayer({
  buildPopupContent,
  onMarkerClick: (jobs) => emit('marker-click', jobs),
  registerMarker
})

const emitBounds = (): void => {
  if (!map) return
  const bounds = map.getBounds()
  emit('bounds-changed', {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest()
  })

  const center = map.getCenter()
  emit('view-changed', { lat: center.lat, lng: center.lng, zoom: map.getZoom() })
}

const initMap = (container: HTMLElement): void => {
  if (map) return

  const center: [number, number] = props.initialView
    ? [props.initialView.lat, props.initialView.lng]
    : GREECE_CENTER
  const zoom = props.initialView?.zoom ?? GREECE_DEFAULT_ZOOM

  map = L.map(container, {
    center,
    zoom,
    zoomControl: true,
    scrollWheelZoom: true
  })

  stopDarkModeListener = darkModeTileLayer.attachTo(map)
  markerClusterLayer.attachTo(map)

  map.on('moveend', emitBounds)
}

/**
 * Show/hide the nationwide remote-jobs overlay (see remoteJobsLayer).
 * Hidden in heatmap view, where a translucent country-wide fill would
 * visually compete with the heatmap's own color scale.
 */
const updateRemoteLayer = (): void => {
  if (!map) return
  remoteJobsLayer.update(map, props.remoteJobs ?? [], viewMode.value !== 'heatmap')
}

/**
 * Rebuilds the city-marker layer, the remote overlay, and (if active) the
 * heatmap from the current `props.jobs`/`props.remoteJobs`. Does not
 * re-fit the viewport -- callers decide whether that's appropriate (see
 * `syncMapForJobsChange` vs. the initial mount, which respects a
 * persisted view instead of always fitting to markers).
 */
const refreshJobLayers = (): void => {
  // Reset once per cycle: both layer factories only ever *add* entries via
  // registerMarker, they never clear this shared registry themselves.
  markersByJobId = new Map()

  markerClusterLayer.update(props.jobs)
  updateRemoteLayer()
  if (viewMode.value === 'heatmap') {
    heatmapLayer.update(props.jobs)
  }
}

/**
 * Show either the clustered pin markers or a density heatmap.
 * Both layers are kept up to date; only one is attached to the map.
 * Heatmap rendering relies on 2D canvas support; if it's unavailable or
 * fails for any reason, we fall back to the marker view instead of
 * crashing the app.
 */
const applyViewMode = (): void => {
  if (!map) return

  if (viewMode.value === 'heatmap') {
    try {
      heatmapLayer.update(props.jobs)
      markerClusterLayer.detachFrom(map)
      heatmapLayer.attachTo(map)
      updateRemoteLayer()
      return
    } catch (err) {
      console.error('Heatmap view is unavailable, falling back to markers.', err)
      heatmapLayer.detachFrom(map)
      viewMode.value = 'markers'
    }
  }

  heatmapLayer.detachFrom(map)
  markerClusterLayer.attachTo(map)
  updateRemoteLayer()
}

const toggleViewMode = (): void => {
  viewMode.value = viewMode.value === 'markers' ? 'heatmap' : 'markers'
  applyViewMode()
}

/**
 * Rebuilds every job-derived map layer and re-fits the viewport. Runs
 * whenever the job list or remote-job list changes after the initial
 * mount.
 */
const syncMapForJobsChange = (): void => {
  if (!map) return
  refreshJobLayers()
  markerClusterLayer.fitBounds(map)
}

/**
 * Pan/zoom to and open the popup for a specific job's marker.
 * Used when a job is selected from the list panel.
 */
const flyToJob = (jobId: string): void => {
  const marker = markersByJobId.get(jobId)
  if (!map || !marker) return

  map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 12))
  marker.openPopup()
}

defineExpose({ flyToJob, toggleViewMode })

let highlightedMarker: L.Marker | null = null

const applyHighlight = (jobId: string | null | undefined): void => {
  const previousElement = highlightedMarker?.getElement()
  previousElement?.classList.remove('marker-highlighted')
  highlightedMarker = null

  if (!jobId) return

  const marker = markersByJobId.get(jobId)
  if (!marker) return

  highlightedMarker = marker
  marker.getElement()?.classList.add('marker-highlighted')
}

onMounted(() => {
  if (!mapContainer.value) return

  initMap(mapContainer.value)
  refreshJobLayers()
  applyViewMode()

  // Only auto-fit to markers when we don't have a persisted view to
  // restore to (e.g. from a shared URL) -- otherwise respect it.
  if (!props.initialView && map) {
    markerClusterLayer.fitBounds(map)
  }
  // Ensure listeners always receive an initial viewport, even when there
  // are no markers to fit bounds to (moveend wouldn't otherwise fire).
  emitBounds()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => map?.invalidateSize())
    resizeObserver.observe(mapContainer.value)
  }
})

onUnmounted(() => {
  stopDarkModeListener?.()
  resizeObserver?.disconnect()
  if (map) {
    try {
      map.remove()
    } catch (err) {
      // A layer that failed to fully initialize (e.g. heatmap without
      // canvas support) can leave Leaflet's internal DOM bookkeeping in an
      // inconsistent state; swallow teardown errors rather than letting
      // them surface as unhandled exceptions.
      console.error('Error while tearing down the map', err)
    }
    map = null
  }
})

watch([() => props.jobs, () => props.remoteJobs], syncMapForJobsChange, { deep: true })

watch(() => props.highlightedJobId, applyHighlight)
</script>

<template>
  <div class="relative w-full h-full min-h-[300px]">
    <div
      ref="mapContainer"
      role="region"
      aria-label="Interactive map of job locations across Greece. The job list panel provides the same data in text form."
      class="absolute inset-0"
    ></div>

    <button
      type="button"
      class="map-view-toggle absolute top-3 right-3 z-[1000] rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md bg-(--color-bg) text-(--color-text-1) ring-1 ring-inset ring-(--color-divider) cursor-pointer hover:opacity-90"
      :aria-pressed="viewMode === 'heatmap'"
      :title="
        (viewMode === 'markers' ? 'Switch to heatmap view' : 'Switch to marker view') + ' (Alt+H)'
      "
      aria-keyshortcuts="Alt+h"
      @click="toggleViewMode"
    >
      {{ viewMode === 'markers' ? 'Heatmap' : 'Markers' }}
    </button>
  </div>
</template>

<style>
.custom-marker {
  background: none;
  border: none;
}

.marker-pin {
  width: 30px;
  height: 30px;
  border-radius: 50% 50% 50% 0;
  background: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  transform: rotate(-45deg);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.marker-highlighted .marker-pin {
  transform: rotate(-45deg) scale(1.35);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);
  z-index: 1000;
}

/*
 * Distinguishes the fixed "remote jobs" marker (placed at the country's
 * center, representing all of Greece) from city-pinned markers.
 */
.marker-pin-remote {
  background: #8b5cf6;
}

.marker-highlighted .marker-pin-remote {
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.4);
}

.marker-cluster-custom {
  background: none;
  border: none;
}

.marker-cluster-inner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 13px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  border: 2px solid rgba(255, 255, 255, 0.6);
}

.marker-cluster-small {
  background: #34d399;
}

.marker-cluster-medium {
  background: #f59e0b;
}

.marker-cluster-large {
  background: #ef4444;
}

.leaflet-popup-content-wrapper {
  border-radius: 8px;
}

.leaflet-popup-content {
  margin: 12px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  max-height: 300px;
  overflow-y: auto;
}

.leaflet-popup-content strong {
  font-size: 14px;
}

.jobs-list.scrollable {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 8px;
  padding-right: 4px;
}

.jobs-list.scrollable::-webkit-scrollbar {
  width: 6px;
}

.jobs-list.scrollable::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}
</style>
