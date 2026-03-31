<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Job } from '@/types/types'

const props = defineProps<{
  jobs: Job[]
}>()

const GREEK_CITIES = [
  'athens',
  'thessaloniki',
  'heraklion',
  'patras',
  'volos',
  'ioannina',
  'larissa',
  'trikala',
  'chalkida',
  'samos',
  'rhodes',
  'crete',
  'corfu',
  'mykonos',
  'santorini',
  'kalamata',
  'xanthi',
  'alexandroupoli',
  'kavala',
  'serres',
  'katerini',
  'komotini',
  'ag. paraskevi',
  'ag-paraskevi',
  'marousi',
  'nea smyrni',
  'pyrgos',
  'kozani',
  'karditsa',
  'lamia',
  'thiva',
  'agrinio',
  'piraeus',
  'peristeri',
  'ilion',
  'metamorphosi',
  'halandri',
  'vouleftika',
  'glyfada',
  'irakleio',
  'mesolongi',
  'sparta',
  'tripoli',
  'nafplio'
]

const greeceCoords: Record<string, [number, number]> = {
  athens: [37.9838, 23.7275],
  thessaloniki: [40.6401, 22.9444],
  heraklion: [35.3617, 25.1648],
  irakleion: [35.3617, 25.1648],
  irakleio: [35.3617, 25.1648],
  iraklion: [35.3617, 25.1648],
  patras: [38.2464, 21.7346],
  volos: [39.3611, 22.9422],
  ioannina: [39.665, 20.8537],
  larissa: [39.639, 22.4196],
  trikala: [39.5544, 21.7681],
  chalkida: [38.4636, 23.5872],
  samos: [37.7547, 26.9784],
  rhodes: [36.4349, 28.2176],
  crete: [35.2401, 24.8093],
  corfu: [39.6249, 19.9214],
  mykonos: [37.4467, 25.3289],
  santorini: [36.3932, 25.4615],
  kalamata: [37.0367, 22.1142],
  xanthi: [41.1342, 24.8879],
  alexandroupoli: [40.9131, 25.8731],
  kavala: [40.9399, 24.4017],
  serres: [41.0859, 23.5473],
  katerini: [40.2697, 22.4992],
  komotini: [41.1223, 25.4062],
  'ag. paraskevi': [38.0167, 23.8167],
  'ag-paraskevi': [38.0167, 23.8167],
  marousi: [38.0492, 23.8069],
  'nea smyrni': [37.9351, 23.6963],
  pyrgos: [37.6695, 21.4421],
  kozani: [40.3006, 21.7886],
  karditsa: [39.3647, 21.9215],
  lamia: [38.9, 22.4345],
  thiva: [38.324, 23.3177],
  agrinio: [38.6256, 21.4081],
  piraeus: [37.9475, 23.6426],
  peristeri: [38.0178, 23.6878],
  ilion: [38.0353, 23.6965],
  metamorphosi: [38.0633, 23.7581],
  halandri: [38.0161, 23.8042],
  vouleftika: [37.9165, 23.9485],
  glyfada: [37.8651, 23.7536],
  mesolongi: [38.3686, 21.6631],
  sparta: [37.0758, 22.4306],
  tripoli: [37.5089, 22.3787],
  nafplio: [37.5706, 22.8765]
}

const greeceCenter: [number, number] = [39.0742, 21.8243]

let map: L.Map | null = null
let markersLayer: L.LayerGroup | null = null

const getCoords = (location: string): [number, number] | null => {
  const normalized = location.toLowerCase().trim()

  if (normalized === 'greece' || normalized === 'remote') return null

  for (const city of GREEK_CITIES) {
    if (normalized.includes(city)) {
      return greeceCoords[city] || null
    }
  }

  return null
}

const initMap = () => {
  if (map) return

  const mapContainer = document.getElementById('jobs-map')
  if (!mapContainer) return

  map = L.map('jobs-map', {
    center: greeceCenter,
    zoom: 6,
    zoomControl: true,
    scrollWheelZoom: true
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)
}

const updateMarkers = () => {
  if (!map || !markersLayer) return

  markersLayer.clearLayers()

  const coordsMap = new Map<string, { lat: number; lng: number; jobs: Job[] }>()

  for (const job of props.jobs) {
    const location = job[2]
    const coords = getCoords(location)
    if (!coords) continue

    const key = `${coords[0]},${coords[1]}`
    if (coordsMap.has(key)) {
      coordsMap.get(key)!.jobs.push(job)
    } else {
      coordsMap.set(key, { lat: coords[0], lng: coords[1], jobs: [job] })
    }
  }

  for (const [, data] of coordsMap) {
    const jobCount = data.jobs.length
    const firstJob = data.jobs[0]
    if (!firstJob) continue

    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-pin">${jobCount}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 30],
      popupAnchor: [0, -30]
    })

    const popupContent =
      jobCount === 1
        ? `<strong>${firstJob[0]}</strong><br>${firstJob[1]}<br><em>${firstJob[2]}</em>`
        : `<strong>${jobCount} jobs</strong><div class="jobs-list${jobCount > 15 ? ' scrollable' : ''}">${data.jobs.map((j) => `${j[0]} - ${j[1]}`).join('<br>')}</div>`

    L.marker([data.lat, data.lng], { icon }).bindPopup(popupContent).addTo(markersLayer!)
  }

  if (coordsMap.size > 0) {
    const bounds = L.latLngBounds(
      Array.from(coordsMap.values()).map((d) => [d.lat, d.lng] as [number, number])
    )
    map.fitBounds(bounds, { padding: [30, 30] })
  }
}

onMounted(() => {
  initMap()
  updateMarkers()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

watch(() => props.jobs, updateMarkers, { deep: true })
</script>

<template>
  <div class="relative w-full h-full min-h-[300px]">
    <div id="jobs-map" class="absolute inset-0 w-full h-full rounded-lg overflow-hidden"></div>
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
