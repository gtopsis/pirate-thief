import { onMounted, onUnmounted, ref } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { jobsSourceName } from '@/config'

const UPDATE_INTERVAL_MS = 60_000 // Update the "time ago" text every minute

/**
 * Tracks a human-readable "time ago" label for the most recent successful
 * fetch, crediting the data source (e.g. "Fetched 2 minutes ago from
 * Startup Pirate"), ticking on an interval so the text stays accurate over
 * time without requiring a new fetch. Call `markUpdatedNow()` whenever a
 * fetch completes successfully.
 *
 * The refresh interval is started/stopped via this component's own
 * mount/unmount lifecycle by default. Pass `autoRefresh = false` to manage
 * that yourself instead (via the returned `start()`/`stop()`) -- e.g. when
 * calling this from somewhere without a component lifecycle to hook into,
 * such as a plain unit test.
 */
export const useLastUpdatedText = (autoRefresh = true) => {
  const lastUpdatedDate = ref<Date | null>(null)
  const lastUpdatedText = ref('Jobs have not been fetched yet')

  const refreshText = (): void => {
    if (lastUpdatedDate.value) {
      lastUpdatedText.value = `Fetched ${formatDistanceToNow(lastUpdatedDate.value)} ago from ${jobsSourceName}`
    }
  }

  const markUpdatedNow = (): void => {
    lastUpdatedDate.value = new Date()
    refreshText()
  }

  let intervalId: number | undefined

  const start = (): void => {
    intervalId = window.setInterval(refreshText, UPDATE_INTERVAL_MS)
  }

  const stop = (): void => {
    if (intervalId) clearInterval(intervalId)
    intervalId = undefined
  }

  if (autoRefresh) {
    onMounted(start)
    onUnmounted(stop)
  }

  return { lastUpdatedText, markUpdatedNow, start, stop }
}
