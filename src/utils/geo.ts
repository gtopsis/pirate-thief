import rawCities from '@/data/greek-cities.json'
import type { Job } from '@/types/types'

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

interface CityEntry {
  canonical: string
  coords: [number, number]
  aliases: string[]
}

interface AliasEntry {
  alias: string
  entry: CityEntry
}

const CITY_ENTRIES = rawCities as CityEntry[]

export const GREECE_CENTER: [number, number] = [39.0742, 21.8243]
export const GREECE_DEFAULT_ZOOM = 6

/**
 * Normalize a free-text location string for matching: strips accents/
 * diacritics (so "Néo Irákleio" and "Neo Irakleio" compare equal),
 * lowercases, and collapses any punctuation/whitespace run into a single
 * space. This means aliases only need to be authored once (e.g.
 * "ag paraskevi" covers "Ag. Paraskevi", "Ag-Paraskevi", "AG PARASKEVI", etc.)
 * instead of enumerating every punctuation variant by hand.
 */
const normalizeLocation = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Flattened (alias, city) pairs, normalized once at module load and sorted
// longest-alias-first. Longest-first ensures more specific, multi-word
// names (e.g. "neo heraklio") are always matched before shorter
// substrings they happen to contain (e.g. "heraklio"/"heraklion") --
// without this, substring matching could silently misplace jobs onto the
// wrong city (see the Neo Heraklio vs Heraklion, Crete distinction).
const ALIAS_ENTRIES: AliasEntry[] = CITY_ENTRIES.flatMap((entry) =>
  entry.aliases.map((alias) => ({ alias: normalizeLocation(alias), entry }))
).sort((a, b) => b.alias.length - a.alias.length)

const NON_MAPPABLE_VALUES = new Set(['greece', 'remote', ''])

const findExactMatch = (normalizedInput: string): CityEntry | null => {
  for (const { alias, entry } of ALIAS_ENTRIES) {
    if (normalizedInput.includes(alias)) return entry
  }
  return null
}

// --- Fuzzy fallback (catches typos in otherwise-recognizable names) ---

// Aliases shorter than this are excluded from fuzzy matching: short
// strings (e.g. "Kos") are too easy to accidentally match against an
// unrelated typo, so we only trust an exact match for them.
const FUZZY_MIN_ALIAS_LENGTH = 4
// Absolute edit-distance cap, regardless of string length.
const FUZZY_MAX_DISTANCE = 2
// Minimum normalized similarity (1 - distance / longerLength) required,
// in addition to the absolute cap above, so short-ish aliases still
// require a close match rather than just "within 2 edits".
const FUZZY_MIN_SIMILARITY = 0.75

/**
 * Classic Levenshtein edit distance between two strings, computed with a
 * rolling single-row DP table (O(n) space instead of O(m*n)).
 */
const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let previousRow = Array.from({ length: b.length + 1 }, (_, index) => index)

  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i]

    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1
      currentRow[j] = Math.min(
        currentRow[j - 1]! + 1, // insertion
        previousRow[j]! + 1, // deletion
        previousRow[j - 1]! + substitutionCost // substitution
      )
    }

    previousRow = currentRow
  }

  return previousRow[b.length]!
}

/**
 * Attempts to fuzzy-match the normalized input against known aliases by
 * sliding a word-window (matching each alias's word count) across the
 * input's tokens and comparing edit distance. Returns the closest city
 * whose distance/similarity clears both safety thresholds, or null if
 * nothing is close enough to trust.
 */
const findFuzzyMatch = (normalizedInput: string): CityEntry | null => {
  const inputTokens = normalizedInput.split(' ').filter(Boolean)
  if (inputTokens.length === 0) return null

  let best: { entry: CityEntry; distance: number } | null = null

  for (const { alias, entry } of ALIAS_ENTRIES) {
    if (alias.length < FUZZY_MIN_ALIAS_LENGTH) continue

    const aliasWordCount = alias.split(' ').length

    for (let start = 0; start + aliasWordCount <= inputTokens.length; start++) {
      const window = inputTokens.slice(start, start + aliasWordCount).join(' ')
      const distance = levenshteinDistance(window, alias)
      const longerLength = Math.max(window.length, alias.length)
      const similarity = longerLength === 0 ? 1 : 1 - distance / longerLength

      if (distance > FUZZY_MAX_DISTANCE || similarity < FUZZY_MIN_SIMILARITY) continue
      if (!best || distance < best.distance) {
        best = { entry, distance }
      }
    }
  }

  return best?.entry ?? null
}

const coordsCache = new Map<string, [number, number] | null>()

/**
 * Resolve a free-text location string to known coordinates.
 * Returns null for locations we can't place on the map (e.g. "Remote", "Greece",
 * or anything that doesn't resolve via exact or fuzzy matching).
 */
export const getCoordsForLocation = (location: string): [number, number] | null => {
  if (coordsCache.has(location)) {
    return coordsCache.get(location)!
  }

  const normalized = normalizeLocation(location)
  let result: [number, number] | null = null

  if (!NON_MAPPABLE_VALUES.has(normalized)) {
    const entry = findExactMatch(normalized) ?? findFuzzyMatch(normalized)
    result = entry ? entry.coords : null
  }

  coordsCache.set(location, result)
  return result
}

/**
 * Resolve the coordinates for a given job based on its location field.
 */
export const getJobCoords = (job: Job): [number, number] | null => getCoordsForLocation(job[2])

/**
 * Whether a job can be placed on the map (has resolvable coordinates).
 */
export const isJobMappable = (job: Job): boolean => getJobCoords(job) !== null

/**
 * Jobs whose location couldn't be resolved to map coordinates -- useful
 * for surfacing a "N jobs couldn't be placed on the map" notice so data
 * issues (typos, unlisted places) are visible instead of silently
 * disappearing from the map.
 */
export const getUnmappableJobs = (jobs: readonly Job[]): Job[] =>
  jobs.filter((job) => !isJobMappable(job))

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
