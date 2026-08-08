import { computed } from 'vue'
import { useFetch } from '@/composables/useFetch'
import { useLastUpdatedText } from '@/composables/useLastUpdatedText'
import { jobsListApiUrl } from '@/utils'
import { parseJobs } from '@/utils/jobs'
import type { SpreadSheetResponse } from '@/types/types'

/**
 * Owns fetching and parsing the job spreadsheet: this is the only module
 * in the app aware that job data comes from a published Google Sheet at
 * all. Everything downstream (filtering, the map, etc.) just sees a
 * reactive `Job[]` list plus loading/error state, and can `refresh()`
 * without knowing anything about the underlying source.
 */
export const useJobsSource = () => {
  const { isLoading, error, data, fetchData } = useFetch<SpreadSheetResponse>(jobsListApiUrl)
  const { lastUpdatedText, markUpdatedNow } = useLastUpdatedText()

  const jobs = computed(() => parseJobs(data.value))

  const refresh = async (): Promise<void> => {
    await fetchData()

    if (error.value) {
      console.error(error.value)
      return
    }

    markUpdatedNow()
  }

  return { jobs, isLoading, error, lastUpdatedText, refresh }
}
