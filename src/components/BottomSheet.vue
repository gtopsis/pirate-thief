<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { pluralize } from '@/utils/text'

const SNAP_POINTS = {
  collapsed: 0.12,
  half: 0.55,
  full: 0.92
} as const

type SnapPoint = keyof typeof SNAP_POINTS

// Below this amount of vertical pointer movement (in pixels), a gesture is
// treated as a tap (handled by @click's toggleSnap) rather than a drag
// (handled by onPointerUp's snap-to-nearest) -- see onPointerUp.
const DRAG_THRESHOLD_PX = 10

const props = defineProps<{
  jobCount: number
}>()

const snap = ref<SnapPoint>('collapsed')

/**
 * The Visual Viewport API tracks the *currently visible* viewport height,
 * shrinking/growing as the mobile browser's address bar/toolbar
 * shows/hides -- unlike `window.innerHeight`, which stays pinned to the
 * largest possible viewport. Falls back to `window.innerHeight` where
 * unsupported. This must match what the sheet's height is styled with
 * (`dvh`, see the template) so a drag ratio computed here always maps to
 * a height that's actually reachable on screen.
 */
const getViewportHeight = (): number =>
  typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 800

const viewportHeight = ref(getViewportHeight())
const isDragging = ref(false)
const hasDraggedPastThreshold = ref(false)
const dragStartY = ref(0)
const dragStartHeightRatio = ref(0)
const currentHeightRatio = ref<number>(SNAP_POINTS.collapsed)

const isExpanded = computed(() => snap.value !== 'collapsed')
const isFull = computed(() => snap.value === 'full')

const updateViewportHeight = (): void => {
  viewportHeight.value = getViewportHeight()
}

const setSnap = (point: SnapPoint): void => {
  snap.value = point
  currentHeightRatio.value = SNAP_POINTS[point]
}

const toggleSnap = (): void => {
  setSnap(snap.value === 'collapsed' ? 'half' : 'collapsed')
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

const onPointerDown = (event: PointerEvent): void => {
  isDragging.value = true
  hasDraggedPastThreshold.value = false
  dragStartY.value = event.clientY
  dragStartHeightRatio.value = currentHeightRatio.value
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent): void => {
  if (!isDragging.value) return

  const deltaY = dragStartY.value - event.clientY
  if (Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
    hasDraggedPastThreshold.value = true
  }

  const deltaRatio = deltaY / viewportHeight.value
  const nextRatio = dragStartHeightRatio.value + deltaRatio
  currentHeightRatio.value = Math.min(SNAP_POINTS.full, Math.max(0.06, nextRatio))
}

/**
 * A plain tap (pointerdown+pointerup with no meaningful movement) is left
 * entirely to @click's toggleSnap -- so from any state (including 'full',
 * only reachable by dragging), a single tap always steps the sheet back
 * down (or up from collapsed). Without this guard, even a stationary tap
 * would re-run snap-to-nearest-of-the-current-ratio here first, which is
 * harmless on its own, but conflating "was this a drag?" with "did the
 * click handler already decide?" made the two mechanisms harder to reason
 * about together -- keeping them mutually exclusive removes that
 * ambiguity entirely.
 */
const onPointerUp = (): void => {
  if (!isDragging.value) return
  isDragging.value = false

  if (hasDraggedPastThreshold.value) {
    setSnap(nearestSnap(currentHeightRatio.value))
  } else {
    // Sub-threshold jitter shouldn't leave the sheet at a slightly-off
    // height; snap back exactly to the current point and let @click
    // decide whether to toggle it.
    currentHeightRatio.value = SNAP_POINTS[snap.value]
  }
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
      :aria-label="isExpanded ? 'Collapse job list panel' : 'Expand job list panel'"
      @click="toggleSnap"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <span class="w-10 h-1.5 rounded-full bg-(--color-divider)"></span>
      <span class="flex items-center gap-1 text-xs font-medium text-(--color-text-2)">
        {{ props.jobCount }} {{ pluralize(props.jobCount, 'job') }} in view
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
