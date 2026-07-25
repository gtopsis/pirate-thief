<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.heat'
import type { Job } from '@/types/types'
import { GREECE_CENTER, GREECE_DEFAULT_ZOOM, getJobCoords, getJobId } from '@/utils/geo'
import type { MapBounds } from '@/utils/geo'

export interface MapView {
  lat: number
  lng: number
  zoom: number
}

const props = defineProps<{
  jobs: readonly Job[]
  highlightedJobId?: string | null
  initialView?: MapView | null
}>()

const emit = defineEmits<{
  (e: 'bounds-changed', bounds: MapBounds): void
  (e: 'marker-click', jobs: Job[]): void
  (e: 'view-changed', view: MapView): void
}>()

const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

let map: L.Map | null = null
let clusterGroup: L.MarkerClusterGroup | null = null
let heatLayer: L.HeatLayer | null = null
let tileLayer: L.TileLayer | null = null
let markersByJobId = new Map<string, L.Marker>()
let resizeObserver: ResizeObserver | null = null
const mapContainer = ref<HTMLDivElement | null>(null)
type ViewMode = 'markers' | 'heatmap'
const viewMode = ref<ViewMode>('markers')
const darkModeQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

const clusterIconClass = (count: number): string => {
  if (count >= 30) return 'marker-cluster-large'
  if (count >= 10) return 'marker-cluster-medium'
  return 'marker-cluster-small'
}

const createClusterIcon = (cluster: L.MarkerCluster): L.DivIcon => {
  const count = cluster.getChildCount()
  return L.divIcon({
    html: `<div class="marker-cluster-inner ${clusterIconClass(count)}"><span>${count}</span></div>`,
    className: 'marker-cluster-custom',
    iconSize: L.point(40, 40)
  })
}

const buildPopupContent = (jobs: Job[]): string => {
  if (jobs.length === 1) {
    const [company, title, location] = jobs[0]!
    return `<strong>${title}</strong><br>${company}<br><em>${location}</em>`
  }

  const scrollable = jobs.length > 15 ? ' scrollable' : ''
  const items = jobs.map(([company, title]) => `${company} - ${title}`).join('<br>')
  return `<strong>${jobs.length} jobs</strong><div class="jobs-list${scrollable}">${items}</div>`
}

const applyTileLayer = (isDark: boolean): void => {
  if (!map) return

  if (tileLayer) {
    map.removeLayer(tileLayer)
  }

  tileLayer = L.tileLayer(isDark ? DARK_TILE_URL : LIGHT_TILE_URL, {
    attribution: TILE_ATTRIBUTION,
    subdomains: 'abcd',
    maxZoom: 20
  })
  tileLayer.addTo(map)
}

const handleColorSchemeChange = (event: MediaQueryListEvent): void => {
  applyTileLayer(event.matches)
}

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

  applyTileLayer(darkModeQuery?.matches ?? false)
  darkModeQuery?.addEventListener('change', handleColorSchemeChange)

  clusterGroup = L.markerClusterGroup({
    iconCreateFunction: createClusterIcon,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 50
  })
  map.addLayer(clusterGroup)

  map.on('moveend', emitBounds)
}

const updateMarkers = (): void => {
  if (!map || !clusterGroup) return

  clusterGroup.clearLayers()
  markersByJobId = new Map()

  const coordsGroups = new Map<string, { lat: number; lng: number; jobs: Job[] }>()

  for (const job of props.jobs) {
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

  for (const { lat, lng, jobs } of coordsGroups.values()) {
    const count = jobs.length
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-pin">${count}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    })

    const marker = L.marker([lat, lng], { icon })
    marker.bindPopup(buildPopupContent(jobs))
    marker.on('click', () => emit('marker-click', jobs))

    for (const job of jobs) {
      markersByJobId.set(getJobId(job), marker)
    }

    clusterGroup.addLayer(marker)
  }
}

const fitToMarkers = (): void => {
  if (!map || !clusterGroup) return
  if (clusterGroup.getLayers().length === 0) return

  map.fitBounds(clusterGroup.getBounds(), { padding: [30, 30], maxZoom: 12 })
}

const buildHeatPoints = (): L.HeatLatLngTuple[] => {
  const points: L.HeatLatLngTuple[] = []
  for (const job of props.jobs) {
    const coords = getJobCoords(job)
    if (!coords) continue
    points.push([coords[0], coords[1], 1])
  }
  return points
}

const updateHeatLayer = (): void => {
  const points = buildHeatPoints()

  if (heatLayer) {
    heatLayer.setLatLngs(points)
  } else {
    heatLayer = L.heatLayer(points, { radius: 28, blur: 22, maxZoom: 12 })
  }
}

const removeHeatLayerSafely = (): void => {
  if (!map || !heatLayer) return
  try {
    if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer)
  } catch {
    // A heat layer that failed to fully initialize may leave Leaflet's
    // internal DOM bookkeeping inconsistent; ignore removal errors and
    // just drop our reference so a fresh layer is created next time.
  }
  heatLayer = null
}

/**
 * Show either the clustered pin markers or a density heatmap.
 * Both layers are kept up to date; only one is attached to the map.
 * Heatmap rendering relies on 2D canvas support; if it's unavailable or
 * fails for any reason, we fall back to the marker view instead of
 * crashing the app.
 */
const applyViewMode = (): void => {
  if (!map || !clusterGroup) return

  if (viewMode.value === 'heatmap') {
    try {
      updateHeatLayer()
      if (map.hasLayer(clusterGroup)) map.removeLayer(clusterGroup)
      if (heatLayer && !map.hasLayer(heatLayer)) heatLayer.addTo(map)
      return
    } catch (err) {
      console.error('Heatmap view is unavailable, falling back to markers.', err)
      removeHeatLayerSafely()
      viewMode.value = 'markers'
    }
  }

  removeHeatLayerSafely()
  if (!map.hasLayer(clusterGroup)) clusterGroup.addTo(map)
}

const toggleViewMode = (): void => {
  viewMode.value = viewMode.value === 'markers' ? 'heatmap' : 'markers'
  applyViewMode()
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
  updateMarkers()
  applyViewMode()

  // Only auto-fit to markers when we don't have a persisted view to
  // restore to (e.g. from a shared URL) -- otherwise respect it.
  if (!props.initialView) {
    fitToMarkers()
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
  darkModeQuery?.removeEventListener('change', handleColorSchemeChange)
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

watch(
  () => props.jobs,
  () => {
    updateMarkers()
    if (viewMode.value === 'heatmap') {
      updateHeatLayer()
    }
    fitToMarkers()
  },
  { deep: true }
)

watch(() => props.highlightedJobId, applyHighlight)
</script>

<template>
  <div class="relative w-full h-full min-h-[300px]">
    <div ref="mapContainer" class="absolute inset-0"></div>

    <button
      type="button"
      class="map-view-toggle absolute top-3 right-3 z-[1000] rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md bg-(--color-bg) text-(--color-text-1) ring-1 ring-inset ring-(--color-divider) cursor-pointer hover:opacity-90"
      :aria-pressed="viewMode === 'heatmap'"
      :title="viewMode === 'markers' ? 'Switch to heatmap view' : 'Switch to marker view'"
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
