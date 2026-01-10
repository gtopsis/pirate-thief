<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import BaseSpinner from '@/components/BaseSpinner.vue'
import Brand from '@/components/Brand.vue'
import FilterList from '@/components/FilterList.vue'
import JobList from '@/components/JobList.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useFetch } from '@/composables/useFetch'
import { jobsListSourceUrl } from '@/utils'
import type { SpreadSheetResponse } from '@/types/types'
import {
  UPDATE_INTERVAL_MS,
  parseJobs,
  buildActiveFilterSet,
  filterJobs,
  buildFiltersFromJobs,
  toggleFilterInMap,
} from '@/utils/HomeView.utils'

// === Jobs Data ===
const { isLoading, error, data, fetchData } = useFetch<SpreadSheetResponse>(jobsListSourceUrl)

const validJobList = computed(() => parseJobs(data.value))

// === Filters ===
const filters = shallowRef(new Map<string, boolean>())

const activeFilterSet = computed(() => buildActiveFilterSet(filters.value))

const hasActiveFilters = computed(() => activeFilterSet.value.size > 0)

const filteredJobList = computed(() =>
  hasActiveFilters.value ? filterJobs(validJobList.value, activeFilterSet.value) : validJobList.value,
)

const initFilters = (): void => {
  filters.value = buildFiltersFromJobs(validJobList.value, filters.value)
}

const toggleFilter = (name: string): void => {
  const newFilters = toggleFilterInMap(filters.value, name)
  if (newFilters) filters.value = newFilters
}

// Watch job count to reinit filters only when necessary
const jobCount = computed(() => validJobList.value.length)
watch(jobCount, initFilters, { immediate: true })

// === Last Updated Display ===
const jobsLastUpdatedDate = ref<Date | null>(null)
const jobsLastUpdatedText = computed(() => {
  if (!jobsLastUpdatedDate.value) {
    return 'Jobs have not been fetched yet'
  }
  return `Jobs fetched ${formatDistanceToNow(jobsLastUpdatedDate.value)} ago`
})

const timeUpdateTick = ref(0)
let updateInterval: number | undefined

// === Data Fetching ===
const fetchJobs = async (): Promise<void> => {
  await fetchData()

  if (error.value) {
    console.error(error.value)
    return
  }

  jobsLastUpdatedDate.value = new Date()
  timeUpdateTick.value++
}

const handleRefresh = (): Promise<void> => fetchJobs()

// === Lifecycle ===
onMounted(async () => {
  await fetchJobs()

  updateInterval = window.setInterval(() => {
    timeUpdateTick.value++
  }, UPDATE_INTERVAL_MS)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<template>
  <div class="w-full flex flex-col items-center">
    <header
      class="w-full mx-auto pt-6 pb-3 sticky top-0 mb-4 flex flex-col items-center max-w-5xl bg-(--color-bg)"
    >
      <Brand />
    </header>

    <main class="flex flex-col relative mx-auto w-full max-w-5xl bg-(--color-bg)">
      <div class="toolbar sticky top-0 py-2 bg-(--color-bg)">
        <div class="flex justify-center items-center gap-2 mb-2">
          <h6 class="mb-0">{{ jobsLastUpdatedText }}</h6>

          <RefreshButton class="mb-0" :is-loading="isLoading" @click="handleRefresh" />
        </div>

        <FilterList :filters="filters" @filter:click="toggleFilter" />

        <div class="w-full text-center mt-4">
          <span>{{ filteredJobList.length }} jobs</span>
        </div>
      </div>

      <div class="flex justify-center min-h-[80vh] overflow-y-auto">
        <BaseSpinner v-if="isLoading" class="mx-auto self-center" size="lg" />
        <p v-else-if="error" class="text-center my-4 w-full">
          <span>Fetching jobs failed. Please try again later.</span>
        </p>

        <JobList v-else :jobs="filteredJobList" class="mx-auto" />
      </div>
    </main>
  </div>
</template>
