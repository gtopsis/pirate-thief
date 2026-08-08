import { computed, shallowRef, watch, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Job } from '@/types/types'
import {
  buildActiveFilterSet,
  buildFiltersFromJobs,
  countJobsByTechArea,
  filterJobs,
  searchJobs,
  toggleFilterInMap
} from '@/utils/jobs'
import { applyUrlFiltersToMap, getFiltersFromUrl, setFiltersInUrl } from '@/utils/urlState'
import { getMappableJobs, getRemoteJobs, getUnmappableJobs } from '@/utils/geo'

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

  const jobCounts = computed(() => countJobsByTechArea(jobs.value))

  const activeFilterSet = computed(() => buildActiveFilterSet(filters.value))
  const hasActiveFilters = computed(() => activeFilterSet.value.size > 0)

  // All jobs matching tech-area filters + search, independent of the map
  // viewport. This is what gets rendered as markers on the map.
  const filteredJobList = computed(() => {
    const byTechArea = hasActiveFilters.value
      ? filterJobs(jobs.value, activeFilterSet.value)
      : jobs.value
    return searchJobs(byTechArea, searchQuery.value)
  })

  // Jobs matching the current filters/search whose location couldn't be
  // geocoded at all (typo, unlisted place, etc.) -- surfaced so data-entry
  // issues are visible instead of silently vanishing from the map.
  const unmappableJobs = computed(() => getUnmappableJobs(filteredJobList.value))

  // Jobs matching the current filters/search that are remote listings --
  // these can't be pinned to a single place (the job could be worked from
  // anywhere in Greece), so they're represented separately (e.g. as a
  // nationwide map overlay) instead of being lumped in with unmappableJobs.
  const remoteJobs = computed(() => getRemoteJobs(filteredJobList.value))

  // Jobs matching the current filters/search that resolve to a specific
  // place on the map -- i.e. every one of them except the remote and
  // unmappable jobs above. This is the correct total to compare a
  // viewport-narrowed count against (see HomeView's jobCountText):
  // remote/unmappable jobs are never reachable by panning/zooming, so
  // counting them in that total would wrongly suggest more jobs could be
  // revealed that way than actually can.
  const mappableJobs = computed(() => getMappableJobs(filteredJobList.value))

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
    jobCounts,
    hasActiveFilters,
    filteredJobList,
    unmappableJobs,
    remoteJobs,
    mappableJobs,
    toggleFilter,
    clearAllFilters
  }
}
