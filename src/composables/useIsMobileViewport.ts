import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'
import { isMobileViewport, watchMobileViewport } from '@/utils/viewport'

/**
 * A reactive "is the viewport currently mobile-sized" flag, kept in sync
 * as the browser window is resized/rotated across the breakpoint. Shared
 * by HomeView.vue and BottomSheet.vue so each only ever mounts its own
 * side of the sidebar/bottom-sheet split (JobPanel + JobList, up to
 * ~300 cards) -- not both at once regardless of viewport, which doubled
 * render work for no reason before this existed.
 */
export const useIsMobileViewport = (): Ref<boolean> => {
  const isMobile = ref(isMobileViewport())
  let stopWatching: (() => void) | null = null

  onMounted(() => {
    isMobile.value = isMobileViewport()
    stopWatching = watchMobileViewport((value) => {
      isMobile.value = value
    })
  })

  onUnmounted(() => {
    stopWatching?.()
  })

  return isMobile
}
