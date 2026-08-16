<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useVerticalDragGesture } from '@/composables/useVerticalDragGesture'

const SNAP_POINTS = {
  collapsed: 0.12,
  half: 0.55,
  full: 0.92
} as const

type SnapPoint = keyof typeof SNAP_POINTS

const props = defineProps<{
  /**
   * The single "how many jobs am I looking at" label, shown persistently
   * on this handle regardless of snap state -- this is the mobile
   * canonical place for that information, so the JobPanel content
   * rendered inside this sheet is told not to repeat it (see its
   * `showJobCountText` prop).
   */
  jobCountText: string
}>()

const snap = ref<SnapPoint>('collapsed')

/**
 * The Visual Viewport API tracks the *currently visible* viewport height,
 * shrinking/growing as the mobile browser's address bar/toolbar
 * shows/hides -- unlike `window.innerHeight`, which stays pinned to the
 * largest possible viewport. Falls back to `window.innerHeight` where
 * unsupported. Must match the sheet's `dvh`-styled height (see the
 * template) so a drag ratio computed here always maps to a reachable
 * height on screen.
 */
const getViewportHeight = (): number =>
  typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 800

const viewportHeight = ref(getViewportHeight())

const isExpanded = computed(() => snap.value !== 'collapsed')
const isFull = computed(() => snap.value === 'full')

// Cycled through in this order by tapping the handle -- see toggleSnap.
// Keeping 'full' reachable this way (not just by dragging) is required
// for WCAG 2.5.7 (Dragging Movements): any drag-operated functionality
// needs a single-pointer/keyboard alternative.
const SNAP_CYCLE: SnapPoint[] = ['collapsed', 'half', 'full']

const nextSnapLabel = computed(() => {
  const nextIndex = (SNAP_CYCLE.indexOf(snap.value) + 1) % SNAP_CYCLE.length
  const next = SNAP_CYCLE[nextIndex]
  if (next === 'full') return 'Expand job list panel to full view'
  if (next === 'half') return 'Expand job list panel'
  return 'Collapse job list panel'
})

const updateViewportHeight = (): void => {
  viewportHeight.value = getViewportHeight()
}

const nearestSnap = (ratio: number): SnapPoint => {
  let closest: SnapPoint = 'collapsed'
  let smallestDiff = Number.POSITIVE_INFINITY

  for (const key of Object.keys(SNAP_POINTS) as SnapPoint[]) {
    const diff = Math.abs(SNAP_POINTS[key] - ratio)
    if (diff < smallestDiff) {
      smallestDiff = diff
      closest = key
    }
  }
  return closest
}

const {
  isDragging,
  ratio: currentHeightRatio,
  onPointerDown,
  onPointerMove,
  onPointerUp
} = useVerticalDragGesture({
  initialRatio: SNAP_POINTS.collapsed,
  getViewportHeight: () => viewportHeight.value,
  min: 0.06,
  max: SNAP_POINTS.full,
  // A plain tap (pointerdown+pointerup with no meaningful movement) is
  // left entirely to @click's toggleSnap -- so tapping from 'full' always
  // steps the sheet directly back down to 'collapsed' (see SNAP_CYCLE).
  // Sub-threshold jitter (wasDrag: false) shouldn't leave the sheet at a
  // slightly-off height either; snap back exactly to the current point
  // and let @click decide whether to toggle it.
  onRelease: (ratio, wasDrag) => {
    if (wasDrag) {
      setSnap(nearestSnap(ratio))
    } else {
      currentHeightRatio.value = SNAP_POINTS[snap.value]
    }
  }
})

const setSnap = (point: SnapPoint): void => {
  snap.value = point
  currentHeightRatio.value = SNAP_POINTS[point]
}

const toggleSnap = (): void => {
  const nextIndex = (SNAP_CYCLE.indexOf(snap.value) + 1) % SNAP_CYCLE.length
  setSnap(SNAP_CYCLE[nextIndex]!)
}

onMounted(() => {
  window.addEventListener('resize', updateViewportHeight)
  window.visualViewport?.addEventListener('resize', updateViewportHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportHeight)
  window.visualViewport?.removeEventListener('resize', updateViewportHeight)
})

defineExpose({
  expand: () => setSnap('half'),
  collapse: () => setSnap('collapsed')
})
</script>

<template>
  <div
    class="md:hidden fixed inset-x-0 bottom-0 z-[1000] flex flex-col rounded-t-2xl bg-(--color-bg) shadow-[0_-4px_20px_rgba(0,0,0,0.25)]"
    :class="{ 'transition-[height] duration-300 ease-out': !isDragging }"
    :style="{ height: `${currentHeightRatio * 100}dvh` }"
  >
    <button
      type="button"
      class="shrink-0 w-full flex flex-col items-center gap-1 pt-2 pb-3 cursor-grab active:cursor-grabbing touch-none"
      :aria-expanded="isExpanded"
      :aria-label="nextSnapLabel"
      @click="toggleSnap"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <span class="w-10 h-1.5 rounded-full bg-(--color-divider)"></span>
      <span class="flex items-center gap-1 text-xs font-medium text-(--color-text-2)">
        {{ props.jobCountText }}
        <span aria-hidden="true">{{ isExpanded ? '▾' : '▴' }}</span>
      </span>
    </button>

    <!--
      v-show (not v-if) so the slot content's own state (scroll position,
      search text, etc.) survives collapsing/expanding -- it's just hidden
      and non-interactive while collapsed, instead of being clipped to a
      sliver but still technically focusable/scrollable underneath.
    -->
    <div v-show="isExpanded" class="flex-1 min-h-0">
      <slot :is-full="isFull" />
    </div>
  </div>
</template>
