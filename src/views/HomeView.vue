<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import Brand from '@/components/Brand.vue'
import FilterList from '@/components/FilterList.vue'
import JobList from '@/components/JobList.vue'
import JobListSkeleton from '@/components/JobListSkeleton.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useFetch } from '@/composables/useFetch'
import { jobsListApiUrl } from '@/utils'
import type { SpreadSheetResponse } from '@/types/types'
import {
  UPDATE_INTERVAL_MS,
  parseJobs,
  buildActiveFilterSet,
  filterJobs,
  buildFiltersFromJobs,
  toggleFilterInMap,
  countJobsByTechArea,
  getFiltersFromUrl,
  setFiltersInUrl,
  applyUrlFiltersToMap,
} from '@/utils/HomeView.utils'

// === Jobs Data ===
const { isLoading, error, data, fetchData } = useFetch<SpreadSheetResponse>(jobsListApiUrl)

const validJobList = computed(() => parseJobs(data.value))

const jobCounts = computed(() => countJobsByTechArea(validJobList.value))

// === Filters ===
const filters = shallowRef(new Map<string, boolean>())

const activeFilterSet = computed(() => buildActiveFilterSet(filters.value))

const hasActiveFilters = computed(() => activeFilterSet.value.size > 0)

const filteredJobList = computed(() =>
  hasActiveFilters.value ? filterJobs(validJobList.value, activeFilterSet.value) : validJobList.value,
)

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
    // Sync to URL
    setFiltersInUrl(buildActiveFilterSet(newFilters))
  }
}

const clearAllFilters = (): void => {
  const newFilters = new Map<string, boolean>()
  for (const [key] of filters.value) {
    newFilters.set(key, false)
  }
  filters.value = newFilters
  setFiltersInUrl(new Set())
}

// Watch job count to reinit filters only when necessary
const jobCount = computed(() => validJobList.value.length)
watch(jobCount, initFilters, { immediate: true })

// === Last Updated Display ===
const jobsLastUpdatedDate = ref<Date | null>(null)
const jobsLastUpdatedText = ref('Jobs have not been fetched yet')

const updateLastUpdatedText = (): void => {
  if (jobsLastUpdatedDate.value) {
    jobsLastUpdatedText.value = `Jobs fetched ${formatDistanceToNow(jobsLastUpdatedDate.value)} ago`
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
    case 'escape':
      if (hasActiveFilters.value) {
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
  <header class="w-full mx-auto pt-6 pb-3 sticky top-0 mb-4 flex flex-col items-center max-w-5xl bg-(--color-bg)">
    <Brand />
  </header>

  <main class="flex flex-col relative mx-auto w-full max-w-5xl bg-(--color-bg)">
    <div class="toolbar sticky top-0 py-2 mb-2 bg-(--color-bg)">
      <div class="flex justify-center items-center gap-2 mb-2">
        <p aria-live="polite" aria-atomic="true">{{ jobsLastUpdatedText }}</p>

        <RefreshButton :is-loading="isLoading" @click="handleRefresh" />
      </div>

      <FilterList :filters="filters" :job-counts="jobCounts" @filter:click="toggleFilter" />
    </div>

    <div class="flex justify-center min-h-[80vh] overflow-y-auto">
      <JobListSkeleton v-if="isLoading" class="mx-auto" />
      
      <p v-else-if="error" class="text-center my-4 w-full">
        Fetching jobs failed. Please try again later.
      </p>

      <div v-else-if="filteredJobList.length === 0" class="text-center my-8 w-full">
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-2">
          No jobs match your filters
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-500 mb-4">
          Try selecting different tech areas or clear all filters
        </p>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg bg-(--vt-c-blue-dark) text-white hover:opacity-90 transition-opacity cursor-pointer"
          @click="clearAllFilters"
        >
          Clear all filters
        </button>
        <p class="text-xs text-gray-400 mt-2">or press <kbd class="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono">Esc</kbd></p>
      </div>

      <JobList v-else :jobs="filteredJobList" class="mx-auto" />
    </div>
  </main>
</template>
