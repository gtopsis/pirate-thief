<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import JobList from './components/JobList.vue'
import FilterList from './components/FilterList.vue'
import BaseSpinner from './components/BaseSpinner.vue'
import RefreshButton from './components/RefreshButton.vue'
import Brand from './components/Brand.vue'
import { formatDistanceToNow } from 'date-fns'
import type { Job } from './types/types'

const spreadsheetData = ref<string[][]>([])
const validJobList = computed<Job[]>(() => {
  const numberOfHeadersRows = 5
  const numberOfJobDetails = 5

  return (
    (spreadsheetData.value
      ?.slice(numberOfHeadersRows)
      .filter((item: string[]) => item.length === numberOfJobDetails) as Job[]) || []
  )
})

const filters = ref(new Map<string, boolean>())
const filteredJobList = computed<Job[]>(() => {
  if (
    filters.value.size == 0 ||
    validJobList.value.length == 0 ||
    !Array.from(filters.value.values()).includes(true)
  ) {
    return validJobList.value
  }

  return validJobList.value.filter((job: Job) => {
    const jobTechArea  = job[3]

    return filters.value.get(jobTechArea) === true
  })
})

watch(
  validJobList,
  () => {
    const _filters = new Map<string, boolean>()

    validJobList.value.forEach((job: Job) => {
      const jobTechArea = job[3]
      if (jobTechArea && !_filters.has(jobTechArea)) {
        _filters.set(jobTechArea, false)
      }
    })

    filters.value = _filters
  },
  { deep: true, immediate: true }
)

const updateActiveFilters = (name: string) => {
  if (filters.value.has(name)) {
    filters.value.set(name, !filters.value.get(name))
    const currentFilters = filters.value

    filters.value = new Map()
    filters.value = currentFilters
  }
}

const jobsLastUpdated = ref<string | null>(null)
const updatedTimeAgoText = ref('')
const getUpdatedTimeAgoText = () => {
  return jobsLastUpdated.value ? formatDistanceToNow(jobsLastUpdated.value) + ' ago' : ''
}

const isLoading = ref(false)

const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID
const apiKey = import.meta.env.VITE_GOOGLE_SPREADSHEET_API_KEY
const jobsListSourceUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1?key=${apiKey}`
async function fetchData() {
  isLoading.value = true

  try {
    const response = await fetch(jobsListSourceUrl)
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const jsonData = await response.json(); 
    
    jobsLastUpdated.value = new Date().toLocaleString()
    updatedTimeAgoText.value = getUpdatedTimeAgoText()
    
    return jsonData.values;
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

const refreshData = async () => {
  spreadsheetData.value = []
  spreadsheetData.value = await fetchData()
}

onMounted(async () => {
  spreadsheetData.value = await fetchData()

  window.setInterval(() => {
    updatedTimeAgoText.value = getUpdatedTimeAgoText()
  }, 1000)
})
</script>

<template>
  <div class="w-full">
    <header class="mx-auto mb-12 pt-6 pb-3 sticky top-0">
      <div class="mb-4 flex items-center justify-between">
        <Brand />

        <div class="flex flex-col items-end">
          <RefreshButton class="w-min-[140px]" :is-loading="isLoading" @click="refreshData" />

          <p v-if="updatedTimeAgoText" class="mb-0 mt-2">
            <small>Jobs fetched {{ updatedTimeAgoText }}</small>
          </p>
        </div>
      </div>

      <FilterList :filters="filters" @filter:click="updateActiveFilters" />

      <div class="w-full text-center mt-4">
        <span class="">{{ filteredJobList.length }} jobs</span>
      </div>
    </header>

    <main class="mx-auto w-full flex min-h-[80vh] overflow-y-auto">
      <BaseSpinner v-if="isLoading" class="mx-auto self-center w-12 h-12" />

      <JobList v-else :jobs="filteredJobList" class="mx-auto" />
    </main>
  </div>
</template>

<style scoped>
.logo {
  color: var(--color-brand);
}

header {
  background: var(--color-background);
}

header,
main {
  max-width: 1024px;
}
</style>
