import type { Job } from '@/types/types'

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

const GREEK_CITIES = [
  'athens',
  'thessaloniki',
  // Neo Heraklio / Nea Irakleio is an Athens suburb (Attica), entirely
  // distinct from Heraklion/Irakleio in Crete. These multi-word variants
  // must be matched before the generic single-word "heraklio(n)" entries
  // below, otherwise "Neo Heraklio" would incorrectly resolve to Crete
  // (see getCoordsForLocation for how match order is enforced).
  'neo heraklio',
  'neo iraklio',
  'neo irakleio',
  'nea irakleio',
  'heraklion',
  'irakleion',
  'irakleio',
  'iraklion',
  'iraklio',
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
  'mesolongi',
  'sparta',
  'tripoli',
  'nafplio'
]

// Sorted longest-first so that more specific, multi-word city names (e.g.
// "neo heraklio") are always matched before shorter substrings they happen
// to contain (e.g. "heraklio"/"heraklion"). Without this, substring
// matching would silently misplace jobs onto the wrong city.
const GREEK_CITIES_BY_SPECIFICITY = [...GREEK_CITIES].sort((a, b) => b.length - a.length)

const GREECE_COORDS: Record<string, [number, number]> = {
  athens: [37.9838, 23.7275],
  thessaloniki: [40.6401, 22.9444],
  // Neo Heraklio / Nea Irakleio, Attica (northern Athens suburb) --
  // not to be confused with Heraklion, Crete.
  'neo heraklio': [38.0489, 23.7621],
  'neo iraklio': [38.0489, 23.7621],
  'neo irakleio': [38.0489, 23.7621],
  'nea irakleio': [38.0489, 23.7621],
  heraklion: [35.3617, 25.1648],
  irakleion: [35.3617, 25.1648],
  irakleio: [35.3617, 25.1648],
  iraklion: [35.3617, 25.1648],
  iraklio: [35.3617, 25.1648],
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

export const GREECE_CENTER: [number, number] = [39.0742, 21.8243]
export const GREECE_DEFAULT_ZOOM = 6

/**
 * Resolve a free-text location string to known coordinates.
 * Returns null for locations we can't place on the map (e.g. "Remote", "Greece").
 */
export const getCoordsForLocation = (location: string): [number, number] | null => {
  const normalized = location.toLowerCase().trim()

  if (normalized === 'greece' || normalized === 'remote') return null

  for (const city of GREEK_CITIES_BY_SPECIFICITY) {
    if (normalized.includes(city)) {
      return GREECE_COORDS[city] ?? null
    }
  }

  return null
}

/**
 * Resolve the coordinates for a given job based on its location field.
 */
export const getJobCoords = (job: Job): [number, number] | null => getCoordsForLocation(job[2])

/**
 * Whether a job can be placed on the map (has resolvable coordinates).
 */
export const isJobMappable = (job: Job): boolean => getJobCoords(job) !== null

const isCoordInBounds = (coord: [number, number], bounds: MapBounds): boolean => {
  const [lat, lng] = coord
  return lat <= bounds.north && lat >= bounds.south && lng >= bounds.west && lng <= bounds.east
}

/**
 * Filter jobs down to only those whose resolved coordinates fall
 * within the given map viewport bounds. Jobs without resolvable
 * coordinates (e.g. Remote) are excluded, since they cannot be
 * represented within any viewport.
 */
export const filterJobsByBounds = (jobs: readonly Job[], bounds: MapBounds | null): Job[] => {
  if (!bounds) return [...jobs]

  return jobs.filter((job) => {
    const coords = getJobCoords(job)
    return coords !== null && isCoordInBounds(coords, bounds)
  })
}

/**
 * A stable identity for a job, used to correlate list items with map markers.
 * Falls back to a composite key if the URL is missing/duplicated.
 */
export const getJobId = (job: Job): string => job[4] || `${job[0]}-${job[1]}-${job[2]}`
