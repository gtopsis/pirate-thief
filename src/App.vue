<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import axios from 'axios'
import JobList from './components/JobList.vue'
import FilterList from './components/FilterList.vue'
import Spinner from './components/Spinner.vue'

const isLoading = ref(false)

const jobList = ref<any[]>([])
const validList = computed<any[]>(
  () => jobList.value?.slice(5).filter((item: any[]) => item.length !== 0) || []
)

const filters = computed<Map<string, boolean>>(() => {
  const result = new Map<string, boolean>()

  validList.value.forEach((item: any[]) => {
    if (item[3] && !result.has(item[3])) {
      result.set(item[3], false)
    }
  })

  return result
})

async function fetchData() {
  isLoading.value = true

  const spreadsheetId = '1s8XLKx-D23jEBM-LifstRFWX2Zj6Lv98twNxObHeXjQ'
  const apiKey = 'AIzaSyAe3TLRIX9Yvz7bYXuz2_hyIQpoO1lrR08'
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1?key=${apiKey}`

  try {
    const response = await axios.get(url)
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
})
</script>

<template>
  <div class="w-full h-full">
    <section class="mx-auto">
      <header class="mb-12 py-4">
        <div class="mb-4 flex items-center justify-between">
          <h5
            class="block font-sans font-semibold leading-snug tracking-normal text-blue-gray-900 antialiased text-2xl mb-4"
          >
            Jobs by startup-pirate
          </h5>

          <button @click="refreshData">
            <span>Refresh</span>
          </button>
        </div>

        <FilterList :filters="filters" />
      </header>

      <main class="w-full flex min-h-[80vh] items-center">
        <Spinner v-if="isLoading" class="mx-auto self-center" />
        <JobList v-else :jobs="validList" />
      </main>
    </section>
  </div>
</template>
