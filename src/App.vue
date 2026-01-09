<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import BaseSpinner from './components/BaseSpinner.vue'
import Brand from './components/Brand.vue'
import FilterList from './components/FilterList.vue'
import JobList from './components/JobList.vue'
import RefreshButton from './components/RefreshButton.vue'
import { useFetch } from './composables/fetch'
import { jobsListSourceUrl } from './utils'
import type { Job, SpreadSheetResponse } from './types/types'

const NUMBER_OF_HEADER_ROWS = 5
const NUMBER_OF_JOB_DETAILS = 5
const UPDATE_INTERVAL_MS = 1000

// === Jobs Data ===
const { isLoading, error, data, fetchData } = useFetch<SpreadSheetResponse>(jobsListSourceUrl)

const validJobList = computed<Job[]>(() => {
  const validJobs = data.value?.values
    ?.slice(NUMBER_OF_HEADER_ROWS)
    .filter((item: string[]) => item.length === NUMBER_OF_JOB_DETAILS) as Job[]

  return validJobs ?? []
})

const fetchJobs = async (): Promise<void> => {
  await fetchData()

  if (error.value) {
    console.error(error.value)
    return
  }

  jobsLastUpdatedDate.value = new Date().toLocaleString()
  jobsLastUpdatedText.value = `Jobs fetched ${getUpdatedTimeAgoText()}`
}

const handleRefresh = async (): Promise<void> => {
  await fetchJobs()
}

// === Filters ===
const filters = ref(new Map<string, boolean>())

const hasActiveFilters = computed(() => {
  return Array.from(filters.value.values()).includes(true)
})

const filteredJobList = computed<Job[]>(() => {
  if (filters.value.size === 0 || validJobList.value.length === 0 || !hasActiveFilters.value) {
    return validJobList.value
  }

  return validJobList.value.filter((job: Job) => {
    const jobTechArea = job[3]
    return filters.value.get(jobTechArea) === true
  })
})

const initFilters = (): void => {
  const newFilters = new Map<string, boolean>()

  validJobList.value.forEach((job: Job) => {
    const jobTechArea = job[3]

    if (jobTechArea && !newFilters.has(jobTechArea)) {
      newFilters.set(jobTechArea, false)
    }
  })

  filters.value = newFilters
}

const toggleFilter = (name: string): void => {
  if (!filters.value.has(name)) {
    return
  }

  filters.value.set(name, !filters.value.get(name))
  filters.value = new Map(filters.value)
}

watch(
  validJobList,
  () => {
    initFilters()
  },
  { deep: true, immediate: true },
)

// === Last Updated Display ===
const jobsLastUpdatedDate = ref<string | null>(null)
const jobsLastUpdatedText = ref('Jobs has not been fetched yet')
let updateInterval: number | undefined

const getUpdatedTimeAgoText = (): string => {
  return jobsLastUpdatedDate.value ? `${formatDistanceToNow(jobsLastUpdatedDate.value)} ago` : ''
}

// === Lifecycle ===
onMounted(async () => {
  await fetchJobs()

  updateInterval = window.setInterval(() => {
    jobsLastUpdatedText.value = `Jobs fetched ${getUpdatedTimeAgoText()}`
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
      class="w-full mx-auto pt-6 pb-3 sticky top-0 mb-4 flex flex-col items-center max-w-[1024px] bg-(--color-bg)"
    >
      <Brand />
    </header>

    <main class="flex flex-col relative mx-auto w-full max-w-[1024px] bg-(--color-bg)">
      <div class="toolbar sticky top-0 py-2 bg-(--color-bg)">
        <div class="flex justify-center items-center gap-2 mb-2">
          <h6 class="mb-0">{{ jobsLastUpdatedText }}</h6>

          <RefreshButton class="mb-0" :is-loading="isLoading" @click="handleRefresh" />
        </div>

        <FilterList :filters="filters" class="" @filter:click="toggleFilter" />

        <div class="w-full text-center mt-4">
          <span class="">{{ filteredJobList.length }} jobs</span>
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

<style scoped></style>
