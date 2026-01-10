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
import type { Job, SpreadSheetResponse } from '@/types/types'

const NUMBER_OF_HEADER_ROWS = 5
const NUMBER_OF_JOB_DETAILS = 5
const UPDATE_INTERVAL_MS = 60_000 // Update "time ago" text every minute (sufficient granularity)

// === Jobs Data ===
const { isLoading, error, data, fetchData } = useFetch<SpreadSheetResponse>(jobsListSourceUrl)

const validJobList = computed<Job[]>(() => {
  const values = data.value?.values
  if (!values) return []

  const jobs: Job[] = []
  for (let i = NUMBER_OF_HEADER_ROWS; i < values.length; i++) {
    const row = values[i]
    if (row && row.length === NUMBER_OF_JOB_DETAILS) {
      jobs.push(row as Job)
    }
  }
  return jobs
})

// === Filters ===
// Using shallowRef since we replace the entire Map on updates
const filters = shallowRef(new Map<string, boolean>())

const activeFilterSet = computed(() => {
  const active = new Set<string>()
  for (const [key, value] of filters.value) {
    if (value) active.add(key)
  }
  return active
})

const hasActiveFilters = computed(() => activeFilterSet.value.size > 0)

const filteredJobList = computed<Job[]>(() => {
  if (!hasActiveFilters.value) {
    return validJobList.value
  }

  const activeFilters = activeFilterSet.value
  return validJobList.value.filter((job: Job) => activeFilters.has(job[3]))
})

const initFilters = (): void => {
  const existingFilters = filters.value
  const newFilters = new Map<string, boolean>()

  for (const job of validJobList.value) {
    const jobTechArea = job[3]
    if (jobTechArea && !newFilters.has(jobTechArea)) {
      // Preserve existing filter state if available
      newFilters.set(jobTechArea, existingFilters.get(jobTechArea) ?? false)
    }
  }

  filters.value = newFilters
}

const toggleFilter = (name: string): void => {
  const current = filters.value.get(name)
  if (current === undefined) return

  const newFilters = new Map(filters.value)
  newFilters.set(name, !current)
  filters.value = newFilters
}

// Watch validJobList length to reinit filters only when job count changes
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

// Force reactivity update for "time ago" text
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

const handleRefresh = async (): Promise<void> => {
  await fetchJobs()
}

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
