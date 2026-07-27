<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import AppHero from '@/components/AppHero.vue'
import JobPanel from '@/components/JobPanel.vue'
import JobsMap from '@/components/JobsMap.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useFetch } from '@/composables/useFetch'
import { jobsListApiUrl } from '@/utils'
import { filterJobsByBounds, getJobId, getUnmappableJobs } from '@/utils/geo'
import type { MapBounds } from '@/utils/geo'
import type { Job, SpreadSheetResponse } from '@/types/types'
import {
  UPDATE_INTERVAL_MS,
  parseJobs,
  buildActiveFilterSet,
  filterJobs,
  searchJobs,
  buildFiltersFromJobs,
  toggleFilterInMap,
  countJobsByTechArea,
  getFiltersFromUrl,
  setFiltersInUrl,
  applyUrlFiltersToMap,
  getMapViewFromUrl,
  setMapViewInUrl
} from '@/utils/HomeView.utils'

// === Jobs Data ===
const { isLoading, error, data, fetchData } = useFetch<SpreadSheetResponse>(jobsListApiUrl)

const validJobList = computed(() => parseJobs(data.value))

const jobCounts = computed(() => countJobsByTechArea(validJobList.value))

// === Filters & Search ===
const filters = shallowRef(new Map<string, boolean>())
const searchQuery = ref('')

const activeFilterSet = computed(() => buildActiveFilterSet(filters.value))

const hasActiveFilters = computed(() => activeFilterSet.value.size > 0)

// All jobs matching tech-area filters + search, independent of the map viewport.
// This is what gets rendered as markers on the map.
const filteredJobList = computed(() => {
  const byTechArea = hasActiveFilters.value
    ? filterJobs(validJobList.value, activeFilterSet.value)
    : validJobList.value
  return searchJobs(byTechArea, searchQuery.value)
})

const initFilters = (): void => {
  const baseFilters = buildFiltersFromJobs(validJobList.value, filters.value)
  const urlFilters = getFiltersFromUrl()

  if (urlFilters.size > 0) {
    filters.value = applyUrlFiltersToMap(baseFilters, urlFilters)
  } else {
    filters.value = baseFilters
  }
}

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

// Watch job count to reinit filters only when necessary
const jobCount = computed(() => validJobList.value.length)
watch(jobCount, initFilters, { immediate: true })

// === Map <-> List sync ===
const mapBounds = shallowRef<MapBounds | null>(null)
// Default to showing every matching job in the list regardless of the
// current map viewport (safer default: doesn't depend on the map having
// settled into a meaningful viewport yet, and avoids surprising users with
// an empty list on load). Users can opt in to narrowing the list down to
// only what's currently visible on the map.
const showAllOnMap = ref(true)
const activeJobId = ref<string | null>(null)
const jobsMapRef = ref<InstanceType<typeof JobsMap> | null>(null)
const bottomSheetRef = ref<InstanceType<typeof BottomSheet> | null>(null)

const isViewportFilterAvailable = computed(() => mapBounds.value !== null)

// Restore a previously shared/persisted map center+zoom, if present in the URL.
const initialMapView = getMapViewFromUrl()

const handleViewChanged = (view: { lat: number; lng: number; zoom: number }): void => {
  setMapViewInUrl(view)
}

// Jobs shown in the list panel: narrowed down to the current map viewport,
// unless the user opted to see all matching jobs regardless of pan/zoom.
const panelJobList = computed(() =>
  showAllOnMap.value
    ? filteredJobList.value
    : filterJobsByBounds(filteredJobList.value, mapBounds.value)
)

// Jobs matching the current filters/search whose location couldn't be
// geocoded at all (typo, unlisted place, etc.) -- surfaced in the panel so
// data-entry issues are visible instead of silently vanishing from the map.
const unmappableJobs = computed(() => getUnmappableJobs(filteredJobList.value))

const handleBoundsChanged = (bounds: MapBounds): void => {
  mapBounds.value = bounds
}

const handleJobHover = (jobId: string | null): void => {
  activeJobId.value = jobId
}

const handleJobSelect = (jobId: string): void => {
  activeJobId.value = jobId
  jobsMapRef.value?.flyToJob(jobId)
}

const scrollJobIntoView = (jobId: string): void => {
  nextTick(() => {
    const escapedId = typeof CSS !== 'undefined' ? CSS.escape(jobId) : jobId
    document
      .querySelector(`[data-job-id="${escapedId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

const handleMarkerClick = (jobs: Job[]): void => {
  const firstJob = jobs[0]
  if (!firstJob) return

  const jobId = getJobId(firstJob)
  activeJobId.value = jobId
  bottomSheetRef.value?.expand()
  scrollJobIntoView(jobId)
}

// === Last Updated Display ===
const jobsLastUpdatedDate = ref<Date | null>(null)
const jobsLastUpdatedText = ref('Jobs have not been fetched yet')

const updateLastUpdatedText = (): void => {
  if (jobsLastUpdatedDate.value) {
    jobsLastUpdatedText.value = `Fetched ${formatDistanceToNow(jobsLastUpdatedDate.value)} ago`
  }
}

let updateInterval: number | undefined

// === Data Fetching ===
const fetchJobs = async (): Promise<void> => {
  await fetchData()

  if (error.value) {
    console.error(error.value)
    return
  }

  jobsLastUpdatedDate.value = new Date()
  updateLastUpdatedText()
}

const handleRefresh = (): Promise<void> => fetchJobs()

// === Keyboard Navigation ===
const handleKeydown = (event: KeyboardEvent): void => {
  // Ignore if user is typing in an input
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return
  }

  switch (event.key.toLowerCase()) {
    case 'r':
      if (!isLoading.value) {
        handleRefresh()
      }
      break
    case 'h':
      jobsMapRef.value?.toggleViewMode()
      break
    case 'escape':
      if (hasActiveFilters.value || searchQuery.value) {
        clearAllFilters()
      }
      break
  }
}

// === Lifecycle ===
onMounted(async () => {
  await fetchJobs()

  updateInterval = window.setInterval(updateLastUpdatedText, UPDATE_INTERVAL_MS)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="app-shell h-[100dvh] w-full flex flex-col overflow-hidden bg-(--color-bg)">
    <header
      class="shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 border-b border-(--color-divider)"
    >
      <AppHero compact />

      <div class="flex justify-center md:justify-end items-center gap-2">
        <p aria-live="polite" aria-atomic="true" class="text-xs text-(--color-text-3)">
          {{ jobsLastUpdatedText }}
        </p>
        <RefreshButton :is-loading="isLoading" @click="handleRefresh" />
      </div>
    </header>

    <main class="flex-1 min-h-0 relative flex flex-col md:flex-row">
      <!-- Desktop side panel -->
      <aside
        class="hidden md:flex md:flex-col md:w-[380px] lg:w-[420px] shrink-0 border-r border-(--color-divider) bg-(--color-bg)"
      >
        <JobPanel
          :jobs="panelJobList"
          :total-job-count="filteredJobList.length"
          :is-loading="isLoading"
          :error="!!error"
          :filters="filters"
          :job-counts="jobCounts"
          :search-query="searchQuery"
          :show-all-on-map="showAllOnMap"
          :is-viewport-filter-available="isViewportFilterAvailable"
          :highlighted-job-id="activeJobId"
          :unmappable-jobs="unmappableJobs"
          @filter:click="toggleFilter"
          @clear-filters="clearAllFilters"
          @update:search-query="searchQuery = $event"
          @update:show-all-on-map="showAllOnMap = $event"
          @job:select="handleJobSelect"
          @job:hover="handleJobHover"
        />
      </aside>

      <!-- Map fills the remaining space on every device -->
      <div class="flex-1 min-w-0 relative">
        <JobsMap
          ref="jobsMapRef"
          :jobs="filteredJobList"
          :highlighted-job-id="activeJobId"
          :initial-view="initialMapView"
          class="absolute inset-0"
          @bounds-changed="handleBoundsChanged"
          @marker-click="handleMarkerClick"
          @view-changed="handleViewChanged"
        />

        <!-- Mobile bottom sheet mirrors the same panel -->
        <BottomSheet ref="bottomSheetRef" :job-count="panelJobList.length">
          <JobPanel
            :jobs="panelJobList"
            :total-job-count="filteredJobList.length"
            :is-loading="isLoading"
            :error="!!error"
            :filters="filters"
            :job-counts="jobCounts"
            :search-query="searchQuery"
            :show-all-on-map="showAllOnMap"
            :is-viewport-filter-available="isViewportFilterAvailable"
            :highlighted-job-id="activeJobId"
            :unmappable-jobs="unmappableJobs"
            @filter:click="toggleFilter"
            @clear-filters="clearAllFilters"
            @update:search-query="searchQuery = $event"
            @update:show-all-on-map="showAllOnMap = $event"
            @job:select="handleJobSelect"
            @job:hover="handleJobHover"
          />
        </BottomSheet>
      </div>
    </main>
  </div>
</template>
