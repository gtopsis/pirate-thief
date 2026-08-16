import rawCities from '@/data/greek-cities.json'

/**
 * Free-text location -> known coordinates geocoding engine, used to place
 * jobs on the map. Deliberately self-contained (no knowledge of `Job` or
 * any other domain type) -- see geo.ts for the job-level layer built on
 * top of `getCoordsForLocation`.
 */

interface CityEntry {
  canonical: string
  coords: [number, number]
  aliases: string[]
  /**
   * Whether this place participates in fuzzy (typo-tolerant) matching.
   * Exact/substring matching always applies regardless of this flag --
   * it only restricts the typo-recovery safety net, which would become
   * unsafe for less prominent places (generic text could coincidentally
   * land within edit-distance of an obscure name by chance).
   */
  fuzzy?: boolean
}

interface AliasEntry {
  alias: string
  entry: CityEntry
}

const CITY_ENTRIES = rawCities as CityEntry[]

/**
 * Strips accents/diacritics, lowercases, and collapses punctuation/
 * whitespace into single spaces, so aliases only need to be authored once
 * (e.g. "ag paraskevi" covers "Ag. Paraskevi", "AG-PARASKEVI", etc.).
 */
export const normalizeLocation = (input: string): string =>
  input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Flattened (alias, city) pairs, sorted longest-alias-first so more
// specific, multi-word names (e.g. "neo heraklio") are always matched
// before shorter substrings they happen to contain (e.g. "heraklio"/
// "heraklion") -- otherwise substring matching could misplace jobs onto
// the wrong city (Neo Heraklio vs Heraklion, Crete).
const ALIAS_ENTRIES: AliasEntry[] = CITY_ENTRIES.flatMap((entry) =>
  entry.aliases.map((alias) => ({ alias: normalizeLocation(alias), entry }))
).sort((a, b) => b.alias.length - a.alias.length)

const NON_MAPPABLE_VALUES = new Set(['greece', 'remote', ''])

/**
 * Splits a location on commas into trimmed segments, e.g. "Kifisia,
 * Attica, Greece" -> ["Kifisia", "Attica", "Greece"]. Callers try
 * segments most-specific-first, matching real-world address conventions.
 */
export const splitLocationSegments = (location: string): string[] => {
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
// unrelated typo, so only an exact match is trusted for them.
const FUZZY_MIN_ALIAS_LENGTH = 4
const FUZZY_MAX_DISTANCE = 2
// Minimum normalized similarity required in addition to the distance cap
// above, so short-ish aliases still require a close match.
const FUZZY_MIN_SIMILARITY = 0.75

/**
 * Levenshtein edit distance, computed with a rolling single-row DP table
 * (O(n) space instead of O(m*n)).
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
 * Slides a word-window (matching each alias's word count) across the
 * input's tokens and compares edit distance, returning the closest city
 * that clears both fuzzy-matching thresholds, or null.
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
 * Resolves a free-text location to known coordinates. Comma-separated
 * locations are checked segment by segment, most-specific-first -- the
 * first segment that resolves wins. Returns null when nothing resolves
 * via exact or fuzzy matching in any segment.
 */
export const getCoordsForLocation = (location: string): [number, number] | null => {
  if (coordsCache.has(location)) {
    return coordsCache.get(location)!
  }

  let result: [number, number] | null = null

  for (const segment of splitLocationSegments(location)) {
    const normalized = normalizeLocation(segment)
    // Segments with no place info on their own (e.g. a trailing "Greece")
    // are skipped so a more specific segment can still match.
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
