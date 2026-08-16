import type { Job } from '@/types/types'

export const buildActiveFilterSet = (filters: Map<string, boolean>): Set<string> => {
  const active = new Set<string>()
  for (const [key, value] of filters) {
    if (value) active.add(key)
  }
  return active
}

export const filterJobs = (jobs: Job[], activeFilters: Set<string>): Job[] => {
  if (activeFilters.size === 0) return jobs
  return jobs.filter((job) => activeFilters.has(job.techArea))
}

export const searchJobs = (jobs: Job[], query: string): Job[] => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return jobs

  return jobs.filter(({ company, title, location }) =>
    [company, title, location].some((field) => field?.toLowerCase().includes(normalized))
  )
}

export const buildFiltersFromJobs = (
  jobs: Job[],
  existingFilters: Map<string, boolean>
): Map<string, boolean> => {
  const newFilters = new Map<string, boolean>()

  for (const job of jobs) {
    const jobTechArea = job.techArea
    if (jobTechArea && !newFilters.has(jobTechArea)) {
      newFilters.set(jobTechArea, existingFilters.get(jobTechArea) ?? false)
    }
  }

  return newFilters
}

export const toggleFilterInMap = (
  filters: Map<string, boolean>,
  name: string
): Map<string, boolean> | null => {
  const current = filters.get(name)
  if (current === undefined) return null

  const newFilters = new Map(filters)
  newFilters.set(name, !current)
  return newFilters
}

export const countJobsByTechArea = (jobs: Job[]): Map<string, number> => {
  const counts = new Map<string, number>()

  for (const job of jobs) {
    const techArea = job.techArea
    if (techArea) {
      counts.set(techArea, (counts.get(techArea) ?? 0) + 1)
    }
  }

  return counts
}
