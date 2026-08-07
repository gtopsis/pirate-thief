import { onMounted, onUnmounted, ref } from 'vue'
import { formatDistanceToNow } from 'date-fns'

const UPDATE_INTERVAL_MS = 60_000 // Update the "time ago" text every minute

/**
 * Tracks a human-readable "time ago" label for the most recent successful
 * fetch (e.g. "Fetched 2 minutes ago"), ticking on an interval so the text
 * stays accurate over time without requiring a new fetch. Call
 * `markUpdatedNow()` whenever a fetch completes successfully.
 */
export const useLastUpdatedText = () => {
  const lastUpdatedDate = ref<Date | null>(null)
  const lastUpdatedText = ref('Jobs have not been fetched yet')

  const refreshText = (): void => {
    if (lastUpdatedDate.value) {
      lastUpdatedText.value = `Fetched ${formatDistanceToNow(lastUpdatedDate.value)} ago`
    }
  }

  const markUpdatedNow = (): void => {
    lastUpdatedDate.value = new Date()
    refreshText()
  }

  let intervalId: number | undefined

  onMounted(() => {
    intervalId = window.setInterval(refreshText, UPDATE_INTERVAL_MS)
  })

  onUnmounted(() => {
    if (intervalId) clearInterval(intervalId)
  })

  return { lastUpdatedText, markUpdatedNow }
}
