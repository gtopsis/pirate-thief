<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import axios from 'axios'
import JobList from './components/JobList.vue'
import FilterList from './components/FilterList.vue'
import BaseSpinner from './components/BaseSpinner.vue'
import RefreshButton from './components/RefreshButton.vue'
import Brand from './components/Brand.vue'
import { formatDistanceToNow } from 'date-fns'

const jobList = ref<any[]>([])
const validJobsList = computed<any[]>(
  () => jobList.value?.slice(5).filter((item: any[]) => item.length !== 0) || []
)

const filters = ref(new Map<string, boolean>())
const filteredJobList = computed(() => {
  if (
    filters.value.size == 0 ||
    validJobsList.value.length == 0 ||
    !Array.from(filters.value.values()).includes(true)
  ) {
    return validJobsList.value
  }

  return validJobsList.value.filter((job: any[]) => {
    return filters.value.get(job[3]) == true
  })
})

watch(
  validJobsList,
  () => {
    const result = new Map<string, boolean>()

    validJobsList.value.forEach((item: any[]) => {
      if (item[3] && !result.has(item[3])) {
        result.set(item[3], false)
      }
    })

    filters.value = result
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
    const response = await axios.get(jobsListSourceUrl)
    jobsLastUpdated.value = new Date().toLocaleString()
    updatedTimeAgoText.value = getUpdatedTimeAgoText()

    return response.data.values
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

const refreshData = async () => {
  jobList.value = []
  jobList.value = await fetchData()
}

onMounted(async () => {
  jobList.value = await fetchData()

  window.setInterval(() => {
    updatedTimeAgoText.value = getUpdatedTimeAgoText()
  }, 1000)
})
</script>

<template>
  <div class="w-full">
    <header class="mx-auto mb-12 py-6 sticky top-0">
      <div class="mb-4 flex items-center justify-between">
        <Brand />

        <div class="flex flex-col items-end">
          <RefreshButton class="w-min-[140px]" :isLoading="isLoading" @click="refreshData" />

          <p v-if="updatedTimeAgoText" class="mb-0 mt-2">
            <small>Updated {{ updatedTimeAgoText }}</small>
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
      <JobList v-else :jobs="filteredJobList" class="mx-auto"/>
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
  max-width: 1280px;
}
</style>
