import { getCoordsForLocation, normalizeLocation, splitLocationSegments } from '@/utils/geocode'
import type { Job } from '@/types/types'

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export const GREECE_CENTER: [number, number] = [39.0742, 21.8243]
export const GREECE_DEFAULT_ZOOM = 6

// A location that resolves to no specific place -- just naming the whole
// country -- is treated the same as an explicit "Remote".
const REMOTE_EQUIVALENT_VALUES = new Set(['greece'])

// Matches "remote" as a standalone word (normalized input has no
// punctuation, so word boundaries fall on spaces/string edges).
const REMOTE_KEYWORD = /(^| )remote( |$)/

export const getJobCoords = (job: Job): [number, number] | null =>
  getCoordsForLocation(job.location)

export const isJobMappable = (job: Job): boolean => getJobCoords(job) !== null

/**
 * A location counts as "remote" when it doesn't resolve to a known city,
 * and every comma-separated segment is either "remote" or a bare mention
 * of the country ("Greece") -- i.e. it carries no specific place info at
 * all. This means:
 *  - "Remote", "Remote, Greece", "Fully Remote", "Greece" are all remote.
 *  - Hybrid listings like "Athens (Remote)" or "Remote, Athens" are still
 *    treated as Athens jobs, since a real city resolves first.
 *  - "Kifisia, Attica, Greece" is NOT remote just because it ends in
 *    "Greece" -- "Kifisia"/"Attica" are unresolved place names, not
 *    remote/country placeholders.
 */
export const isRemoteLocation = (location: string): boolean => {
  if (getCoordsForLocation(location) !== null) return false

  return splitLocationSegments(location).every((segment) => {
    const normalized = normalizeLocation(segment)
    return REMOTE_KEYWORD.test(normalized) || REMOTE_EQUIVALENT_VALUES.has(normalized)
  })
}

export const isJobRemote = (job: Job): boolean => isRemoteLocation(job.location)

export const getRemoteJobs = (jobs: readonly Job[]): Job[] => jobs.filter(isJobRemote)

/**
 * Jobs that resolve to a specific place on the map -- i.e. every job
 * except the remote and genuinely-unmappable ones. This is the correct
 * universe to compare a map-viewport-narrowed job count against, since
 * remote/unmappable jobs can never appear as a pin no matter how the map
 * is panned/zoomed.
 */
export const getMappableJobs = (jobs: readonly Job[]): Job[] => jobs.filter(isJobMappable)

export const getUnmappableJobs = (jobs: readonly Job[]): Job[] =>
  jobs.filter((job) => !isJobMappable(job) && !isJobRemote(job))

const isCoordInBounds = (coord: [number, number], bounds: MapBounds): boolean => {
  const [lat, lng] = coord
  return lat <= bounds.north && lat >= bounds.south && lng >= bounds.west && lng <= bounds.east
}

/**
 * Remote jobs have no single coordinate -- they're drawn on the map as a
 * fixed marker at Greece's geographic center (see remoteJobsLayer.ts) --
 * so they're included exactly when that fixed point is in view, matching
 * what's actually visible on screen.
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

export const getJobId = (job: Job): string =>
  job.url || `${job.company}-${job.title}-${job.location}`
