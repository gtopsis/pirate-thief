import type { Job, SpreadSheetResponse } from '@/types/types'

// === Constants ===
export const NUMBER_OF_HEADER_ROWS = 5
export const NUMBER_OF_JOB_DETAILS = 5
export const UPDATE_INTERVAL_MS = 60_000 // Update "time ago" text every minute

// === Pure Functions ===

/**
 * Parse raw spreadsheet response into valid Job array
 */
export const parseJobs = (data: SpreadSheetResponse | null): Job[] => {
  const values = data?.values
  if (!values) return []

  const jobs: Job[] = []
  for (let i = NUMBER_OF_HEADER_ROWS; i < values.length; i++) {
    const row = values[i]
    if (row && row.length === NUMBER_OF_JOB_DETAILS) {
      jobs.push(row as Job)
    }
  }
  return jobs
}

/**
 * Build a Set of active filter names from a filters Map
 */
export const buildActiveFilterSet = (filters: Map<string, boolean>): Set<string> => {
  const active = new Set<string>()
  for (const [key, value] of filters) {
    if (value) active.add(key)
  }
  return active
}

/**
 * Filter jobs based on active tech area filters
 */
export const filterJobs = (jobs: Job[], activeFilters: Set<string>): Job[] => {
  if (activeFilters.size === 0) return jobs
  return jobs.filter((job) => activeFilters.has(job[3]))
}

/**
 * Build initial filters Map from jobs, preserving existing filter states
 */
export const buildFiltersFromJobs = (
  jobs: Job[],
  existingFilters: Map<string, boolean>,
): Map<string, boolean> => {
  const newFilters = new Map<string, boolean>()

  for (const job of jobs) {
    const jobTechArea = job[3]
    if (jobTechArea && !newFilters.has(jobTechArea)) {
      newFilters.set(jobTechArea, existingFilters.get(jobTechArea) ?? false)
    }
  }

  return newFilters
}

/**
 * Toggle a filter value in the Map, returning a new Map
 */
export const toggleFilterInMap = (
  filters: Map<string, boolean>,
  name: string,
): Map<string, boolean> | null => {
  const current = filters.get(name)
  if (current === undefined) return null

  const newFilters = new Map(filters)
  newFilters.set(name, !current)
  return newFilters
}

/**
 * Count jobs per tech area
 */
export const countJobsByTechArea = (jobs: Job[]): Map<string, number> => {
  const counts = new Map<string, number>()

  for (const job of jobs) {
    const techArea = job[3]
    if (techArea) {
      counts.set(techArea, (counts.get(techArea) ?? 0) + 1)
    }
  }

  return counts
}

// === URL State ===
const FILTER_PARAM = 'filters'

/**
 * Parse active filters from URL search params
 */
export const getFiltersFromUrl = (): Set<string> => {
  const params = new URLSearchParams(window.location.search)
  const filterParam = params.get(FILTER_PARAM)
  
  if (!filterParam) return new Set()
  
  return new Set(filterParam.split(',').map(f => decodeURIComponent(f.trim())).filter(Boolean))
}

/**
 * Update URL with active filters (without page reload)
 */
export const setFiltersInUrl = (activeFilters: Set<string>): void => {
  const url = new URL(window.location.href)
  
  if (activeFilters.size === 0) {
    url.searchParams.delete(FILTER_PARAM)
  } else {
    url.searchParams.set(FILTER_PARAM, Array.from(activeFilters).map(f => encodeURIComponent(f)).join(','))
  }
  
  window.history.replaceState({}, '', url.toString())
}

/**
 * Apply URL filters to a filters Map
 */
export const applyUrlFiltersToMap = (
  filters: Map<string, boolean>,
  urlFilters: Set<string>,
): Map<string, boolean> => {
  const newFilters = new Map<string, boolean>()
  
  for (const [key] of filters) {
    newFilters.set(key, urlFilters.has(key))
  }
  
  return newFilters
}
