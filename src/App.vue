<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import axios from 'axios'
import JobList from './components/JobList.vue'
import FilterList from './components/FilterList.vue'
import Spinner from './components/Spinner.vue'
import RefreshButton from './components/RefreshButton.vue'

const isLoading = ref(false)

const jobList = ref<any[]>([])
const validJobsList = computed<any[]>(
  () => jobList.value?.slice(5).filter((item: any[]) => item.length !== 0) || []
)
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

const filters = ref(new Map<string, boolean>())
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

const jobsLastUpdated = ref<string | null>(null)

const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID
const apiKey = import.meta.env.VITE_GOOGLE_SPREADSHEET_API_KEY
const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1?key=${apiKey}`
async function fetchData() {
  isLoading.value = true

  try {
    const response = await axios.get(url)
    jobsLastUpdated.value = new Date().toLocaleString()

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

const updateActiveFilters = (name: string) => {
  if (filters.value.has(name)) {
    filters.value.set(name, !filters.value.get(name))
    const temp = filters.value

    filters.value = new Map()
    filters.value = temp
  }
}

onMounted(async () => {
  jobList.value = await fetchData()
})
</script>

<template>
  <div class="w-full">
    <header class="mx-auto mb-12 py-6 sticky top-0">
      <div class="mb-4 flex items-center justify-between">
        <div class="">
          <h5
            class="logo static block font-sans font-semibold leading-snug tracking-normal text-blue-gray-900 antialiased text-2xl mb-2"
          >
            Pirate Thief
          </h5>

          <h6>
            Jobs list by
            <a
              href="https://docs.google.com/spreadsheets/d/1s8XLKx-D23jEBM-LifstRFWX2Zj6Lv98twNxObHeXjQ/edit?gid=0#gid=0"
              target="_blank"
              rel="noopener noreferrer"
              class="font-bold"
            >
              Startup Pirate
            </a>
          </h6>
        </div>

        <div class="flex items-center">
          <p class="mb-0 mr-4">Updated: {{ jobsLastUpdated }}</p>

          <RefreshButton :isLoading="isLoading" @click="refreshData" />
        </div>
      </div>

      <FilterList :filters="filters" @filter:click="updateActiveFilters" />
    </header>

    <main class="mx-auto w-full flex min-h-[80vh] overflow-y-auto">
      <Spinner v-if="isLoading" class="mx-auto self-center" />
      <JobList v-else :jobs="filteredJobList" />
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
