import { computed, shallowRef, watch, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Job } from '@/types/types'
import {
  buildActiveFilterSet,
  buildFiltersFromJobs,
  filterJobs,
  searchJobs,
  toggleFilterInMap
} from '@/utils/jobs'
import { applyUrlFiltersToMap, getFiltersFromUrl, setFiltersInUrl } from '@/utils/urlState'
import { getRemoteJobs, getUnmappableJobs } from '@/utils/geo'

/**
 * Owns tech-area filter + free-text search state (URL-persisted), and
 * derives the matching job list plus its remote/unmappable
 * classification from it. Doesn't know or care where `jobs` came from,
 * or anything about the map -- it just reacts to whatever job list it's
 * given.
 */
export const useJobFilters = (jobs: Ref<Job[]> | ComputedRef<Job[]>) => {
  const filters = shallowRef(new Map<string, boolean>())
  const searchQuery = ref('')

  const activeFilterSet = computed(() => buildActiveFilterSet(filters.value))
  const hasActiveFilters = computed(() => activeFilterSet.value.size > 0)

  // Jobs matching the free-text search alone, independent of tech-area
  // filters -- exposed separately (rather than only as a private step
  // inside filteredJobList below) so callers that need "what would match
  // if no particular tech area were singled out" have it directly (e.g.
  // HomeView's per-filter-pill job counts, which are also narrowed by
  // the map's current viewport on top of this).
  const searchedJobList = computed(() => searchJobs(jobs.value, searchQuery.value))

  // All jobs matching tech-area filters + search, independent of the map
  // viewport. This is what gets rendered as markers on the map.
  const filteredJobList = computed(() =>
    hasActiveFilters.value
      ? filterJobs(searchedJobList.value, activeFilterSet.value)
      : searchedJobList.value
  )

  // Jobs matching the current filters/search whose location couldn't be
  // geocoded at all (typo, unlisted place, etc.) -- surfaced so data-entry
  // issues are visible instead of silently vanishing from the map.
  const unmappableJobs = computed(() => getUnmappableJobs(filteredJobList.value))

  // Jobs matching the current filters/search that are remote listings --
  // these can't be pinned to a single place (the job could be worked from
  // anywhere in Greece), so they're represented separately (e.g. as a
  // nationwide map overlay) instead of being lumped in with unmappableJobs.
  const remoteJobs = computed(() => getRemoteJobs(filteredJobList.value))

  // Rebuilds the filters Map from the current job list's tech areas
  // (preserving existing selections), then re-applies any filters
  // persisted in the URL. Runs immediately (so filters are ready before
  // the very first fetch resolves) and again whenever `jobs` changes
  // (new fetch, tech areas added/removed).
  const reinitFilters = (): void => {
    const baseFilters = buildFiltersFromJobs(jobs.value, filters.value)
    const urlFilters = getFiltersFromUrl()

    filters.value =
      urlFilters.size > 0 ? applyUrlFiltersToMap(baseFilters, urlFilters) : baseFilters
  }

  watch(jobs, reinitFilters, { immediate: true })

  const toggleFilter = (name: string): void => {
    const newFilters = toggleFilterInMap(filters.value, name)
    if (newFilters) {
      filters.value = newFilters
      setFiltersInUrl(buildActiveFilterSet(newFilters))
    }
  }

  const clearAllFilters = (): void => {
    const newFilters = new Map<string, boolean>()
    for (const [key] of filters.value) {
      newFilters.set(key, false)
    }
    filters.value = newFilters
    searchQuery.value = ''
    setFiltersInUrl(new Set())
  }

  return {
    filters,
    searchQuery,
    hasActiveFilters,
    searchedJobList,
    filteredJobList,
    unmappableJobs,
    remoteJobs,
    toggleFilter,
    clearAllFilters
  }
}
