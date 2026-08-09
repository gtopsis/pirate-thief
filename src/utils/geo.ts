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
  /**
   * Whether this place participates in fuzzy (typo-tolerant) matching.
   * The generated dataset (see scripts/generate-greek-cities.mjs) is a
   * small, curated list of major/well-known places, so every entry sets
   * this to true -- but the flag still exists as a safety net (and an
   * escape hatch, if the list ever grows to include less prominent
   * places where fuzzy-matching would become unsafe: generic English
   * text could then start coincidentally landing within edit-distance
   * of an obscure name purely by chance). Exact/substring matching still
   * applies to every place regardless of this flag; only the
   * typo-recovery safety net is restricted by it.
   */
  fuzzy?: boolean
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

// A location that (after resolving its segments, see splitLocationSegments)
// carries no specific place info -- just naming the whole country -- means
// the same thing as an explicit "Remote": the job could be worked from
// anywhere in Greece. "remote" itself doesn't need to be listed here since
// REMOTE_KEYWORD already matches it.
const REMOTE_EQUIVALENT_VALUES = new Set(['greece'])

// Matches "remote" as a standalone word (normalized input has no
// punctuation, so word boundaries fall on spaces/string edges), catching
// phrasing like "Remote", "Remote, Greece", "Fully Remote" -- but see
// isRemoteLocation below for how this combines with city resolution.
const REMOTE_KEYWORD = /(^| )remote( |$)/

/**
 * Splits a free-text location on commas into trimmed, non-empty segments,
 * e.g. "Kifisia, Attica, Greece" -> ["Kifisia", "Attica", "Greece"].
 * Real-world addresses are conventionally written most-specific-first
 * (city, region, country), so callers try segments in this order and stop
 * at the first one that resolves. Falls back to the whole string as a
 * single segment when there's nothing to split (no commas, or a
 * whitespace/comma-only string), preserving prior behavior for the
 * common single-value case.
 */
const splitLocationSegments = (location: string): string[] => {
  const segments = location
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
  return segments.length > 0 ? segments : [location]
}

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
    if (!entry.fuzzy || alias.length < FUZZY_MIN_ALIAS_LENGTH) continue

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
 * Comma-separated locations (e.g. "Kifisia, Attica, Greece") are checked
 * segment by segment, left to right (most-specific-first, matching how
 * addresses are conventionally written) -- the first segment that
 * resolves to a known city wins. Returns null for locations we can't
 * place on the map (e.g. "Remote", "Greece", or anything that doesn't
 * resolve via exact or fuzzy matching in any segment).
 */
export const getCoordsForLocation = (location: string): [number, number] | null => {
  if (coordsCache.has(location)) {
    return coordsCache.get(location)!
  }

  let result: [number, number] | null = null

  for (const segment of splitLocationSegments(location)) {
    const normalized = normalizeLocation(segment)
    // Segments that carry no place info on their own (e.g. a trailing
    // "Greece") are skipped so a more specific segment can still match --
    // they don't force the whole location to be unmappable.
    if (NON_MAPPABLE_VALUES.has(normalized)) continue

    const entry = findExactMatch(normalized) ?? findFuzzyMatch(normalized)
    if (entry) {
      result = entry.coords
      break
    }
  }

  coordsCache.set(location, result)
  return result
}

/**
 * Resolve the coordinates for a given job based on its location field.
 */
export const getJobCoords = (job: Job): [number, number] | null =>
  getCoordsForLocation(job.location)

/**
 * Whether a job can be placed on the map (has resolvable coordinates).
 */
export const isJobMappable = (job: Job): boolean => getJobCoords(job) !== null

/**
 * Whether a location string represents a remote listing rather than a
 * genuinely unresolvable/mistyped place. A location counts as "remote"
 * when it doesn't resolve to a known city, and every one of its
 * comma-separated segments is either the word "remote" or a bare mention
 * of the country ("Greece") -- i.e. it carries no specific place info at
 * all. This means:
 *  - "Remote", "Remote, Greece", "Fully Remote", "Greece" are all remote.
 *  - Hybrid listings like "Athens (Remote)" or "Remote, Athens" are still
 *    treated as Athens jobs, since a real city resolves first.
 *  - "Kifisia, Attica, Greece" is NOT remote just because it ends in
 *    "Greece" -- "Kifisia"/"Attica" are specific (if unresolved) place
 *    names, not remote/country placeholders, so this stays a genuine
 *    unmappable/data-issue job instead of being silently reclassified.
 */
export const isRemoteLocation = (location: string): boolean => {
  if (getCoordsForLocation(location) !== null) return false

  return splitLocationSegments(location).every((segment) => {
    const normalized = normalizeLocation(segment)
    return REMOTE_KEYWORD.test(normalized) || REMOTE_EQUIVALENT_VALUES.has(normalized)
  })
}

/**
 * Whether a job is a remote listing (see isRemoteLocation).
 */
export const isJobRemote = (job: Job): boolean => isRemoteLocation(job.location)

/**
 * Jobs that are remote listings -- since "remote" means the job could be
 * worked from anywhere in Greece, these are represented separately from
 * both mappable (city-pinned) jobs and genuinely unmappable ones.
 */
export const getRemoteJobs = (jobs: readonly Job[]): Job[] => jobs.filter(isJobRemote)

/**
 * Jobs that resolve to a specific place on the map -- i.e. every matching
 * job except the remote and genuinely-unmappable ones (see
 * getRemoteJobs/getUnmappableJobs). This is the correct universe to
 * compare a map-viewport-narrowed job count against (e.g. "showing 12 of
 * N mappable jobs"): remote/unmappable jobs can never appear as a pin no
 * matter how the map is panned/zoomed, so counting them in that N would
 * wrongly suggest more jobs are reachable by moving the map than
 * actually are.
 */
export const getMappableJobs = (jobs: readonly Job[]): Job[] => jobs.filter(isJobMappable)

/**
 * Jobs whose location couldn't be resolved to map coordinates and aren't
 * remote listings -- useful for surfacing a "N jobs couldn't be placed
 * on the map" notice so genuine data issues (typos, unlisted places) are
 * visible instead of silently disappearing from the map, without lumping
 * in legitimate remote jobs (see getRemoteJobs for those).
 */
export const getUnmappableJobs = (jobs: readonly Job[]): Job[] =>
  jobs.filter((job) => !isJobMappable(job) && !isJobRemote(job))

const isCoordInBounds = (coord: [number, number], bounds: MapBounds): boolean => {
  const [lat, lng] = coord
  return lat <= bounds.north && lat >= bounds.south && lng >= bounds.west && lng <= bounds.east
}

/**
 * Filter jobs down to only those currently represented within the given
 * map viewport bounds. Most jobs resolve to a single coordinate and are
 * included/excluded based on that alone. Remote jobs have no single
 * coordinate -- but they're still drawn on the map, as a fixed marker at
 * Greece's geographic center (see remoteJobsLayer.ts) -- so they're
 * included exactly when that fixed point is currently in view, matching
 * what's actually visible on screen (e.g. zooming into a viewport that
 * happens to contain both a city's pin and the remote marker should
 * surface both cities' and remote jobs, not just the city's).
 */
export const filterJobsByBounds = (jobs: readonly Job[], bounds: MapBounds | null): Job[] => {
  if (!bounds) return [...jobs]

  const isRemoteMarkerInView = isCoordInBounds(GREECE_CENTER, bounds)

  return jobs.filter((job) => {
    const coords = getJobCoords(job)
    if (coords !== null) return isCoordInBounds(coords, bounds)
    return isJobRemote(job) && isRemoteMarkerInView
  })
}

/**
 * A stable identity for a job, used to correlate list items with map markers.
 * Falls back to a composite key if the URL is missing/duplicated.
 */
export const getJobId = (job: Job): string =>
  job.url || `${job.company}-${job.title}-${job.location}`
