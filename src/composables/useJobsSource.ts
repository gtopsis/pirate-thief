import { computed } from 'vue'
import { useFetch } from '@/composables/useFetch'
import { useLastUpdatedText } from '@/composables/useLastUpdatedText'
import { googleSheetsJobsSource as jobsSource } from '@/sources/googleSheets/googleSheetsJobsSource'

/**
 * Owns fetching and transforming job data via the active JobsSourceAdapter
 * (currently googleSheetsJobsSource, see src/sources) -- this is the only
 * module in the app aware of *which* source that is or how it's shaped on
 * the wire. Everything downstream (filtering, the map, etc.) just sees a
 * reactive `Job[]` list plus loading/error state, and can `refresh()`
 * without knowing anything about the underlying source. To point the app
 * at a different data source, swap the import above for a different
 * JobsSourceAdapter implementation -- nothing else here needs to change.
 */
export const useJobsSource = () => {
  const { isLoading, error, data, fetchData } = useFetch(jobsSource.url)
  const { lastUpdatedText, markUpdatedNow } = useLastUpdatedText()

  const jobs = computed(() => jobsSource.toJobs(data.value))

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
