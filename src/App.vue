<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import JobList from './components/JobList.vue'
import FilterList from './components/FilterList.vue'
import BaseSpinner from './components/BaseSpinner.vue'
import RefreshButton from './components/RefreshButton.vue'
import Brand from './components/Brand.vue'
import { formatDistanceToNow } from 'date-fns'
import type { Job, SpreadSheetResponse } from './types/types'
import { useFetch } from './composables/fetch'
import { jobsListSourceUrl } from './utils'

const jobsLastUpdatedDate = ref<string | null>(null)
const jobsLastUpdatedText = ref('Jobs has not been fetched yet')

const { isLoading, error, data, fetchData } = useFetch<SpreadSheetResponse>(jobsListSourceUrl)
async function fetchJobs() {
  await fetchData()
  if (error.value) {
    console.error(error.value)

    return
  }

  jobsLastUpdatedDate.value = new Date().toLocaleString()
  jobsLastUpdatedText.value = `Jobs fetch ${getUpdatedTimeAgoText()}`
}

const validJobList = computed<Job[]>(() => {
  const numberOfHeadersRows = 5
  const numberOfJobDetails = 5

  const validJobs = data.value?.values
    ?.slice(numberOfHeadersRows)
    .filter((item: string[]) => item.length === numberOfJobDetails) as Job[]

  return validJobs || []
})

const filters = ref(new Map<string, boolean>())
const filteredJobList = computed<Job[]>(() => {
  if (
    filters.value.size === 0 ||
    validJobList.value.length === 0 ||
    !Array.from(filters.value.values()).includes(true)
  ) {
    return validJobList.value
  }

  return validJobList.value.filter((job: Job) => {
    const jobTechArea = job[3]

    return filters.value.get(jobTechArea) === true
  })
})

const initFilters = () => {
  const _filters = new Map<string, boolean>()

  validJobList.value.forEach((job: Job) => {
    const jobTechArea = job[3]

    if (jobTechArea && !_filters.has(jobTechArea)) {
      _filters.set(jobTechArea, false)
    }
  })

  filters.value = _filters
}

watch(
  validJobList,
  () => {
    initFilters()
  },
  { deep: true, immediate: true }
)

const activateFilter = (name: string) => {
  if (!filters.value.has(name)) {
    return
  }

  filters.value.set(name, !filters.value.get(name))
  const currentFilters = filters.value

  filters.value = new Map()
  filters.value = currentFilters
}

const getUpdatedTimeAgoText = () => {
  return jobsLastUpdatedDate.value ? formatDistanceToNow(jobsLastUpdatedDate.value) + ' ago' : ''
}

const refreshData = async () => {
  await fetchJobs()
}

onMounted(async () => {
  await fetchJobs()

  window.setInterval(() => {
    jobsLastUpdatedText.value = `Jobs fetch ${getUpdatedTimeAgoText()}`
  }, 1000)
})
</script>

<template>
  <div class="w-full">
    <header
      class="mx-auto pt-6 pb-3 sticky top-0 mb-4 flex flex-col items-center max-w-[1024px] bg-[--color-bg]"
    >
      <Brand />
    </header>

    <main class="flex flex-col relative mx-auto w-full max-w-[1024px] bg-[--color-bg]">
      <div class="toolbar sticky top-0 py-2">
        <div class="flex justify-center items-center gap-2 mb-4">
          <h6 class="mb-0">{{ jobsLastUpdatedText }}</h6>

          <RefreshButton class="mb-0" :is-loading="isLoading" @click="refreshData" />
        </div>

        <FilterList :filters="filters" @filter:click="activateFilter" />

        <div class="w-full text-center mt-4">
          <span class="">{{ filteredJobList.length }} jobs</span>
        </div>
      </div>

      <div class="flex min-h-[80vh] overflow-y-auto">
        <BaseSpinner v-if="isLoading" class="mx-auto self-center" size="lg" />
        <JobList v-else :jobs="filteredJobList" class="mx-auto" />
      </div>
    </main>
  </div>
</template>

<style scoped></style>
