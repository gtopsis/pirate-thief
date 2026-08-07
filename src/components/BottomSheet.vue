<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { pluralize } from '@/utils/text'

const SNAP_POINTS = {
  collapsed: 0.12,
  half: 0.55,
  full: 0.92
} as const

type SnapPoint = keyof typeof SNAP_POINTS

const props = defineProps<{
  jobCount: number
}>()

const snap = ref<SnapPoint>('collapsed')
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
const isDragging = ref(false)
const dragStartY = ref(0)
const dragStartHeightRatio = ref(0)
const currentHeightRatio = ref<number>(SNAP_POINTS.collapsed)

const updateViewportHeight = (): void => {
  viewportHeight.value = window.innerHeight
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
  dragStartY.value = event.clientY
  dragStartHeightRatio.value = currentHeightRatio.value
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent): void => {
  if (!isDragging.value) return

  const deltaY = dragStartY.value - event.clientY
  const deltaRatio = deltaY / viewportHeight.value
  const nextRatio = dragStartHeightRatio.value + deltaRatio
  currentHeightRatio.value = Math.min(SNAP_POINTS.full, Math.max(0.06, nextRatio))
}

const onPointerUp = (): void => {
  if (!isDragging.value) return
  isDragging.value = false
  setSnap(nearestSnap(currentHeightRatio.value))
}

onMounted(() => {
  window.addEventListener('resize', updateViewportHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportHeight)
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
    :style="{ height: `${currentHeightRatio * 100}vh` }"
  >
    <button
      type="button"
      class="shrink-0 w-full flex flex-col items-center gap-1 pt-2 pb-3 cursor-grab active:cursor-grabbing touch-none"
      :aria-expanded="snap !== 'collapsed'"
      aria-label="Toggle job list panel"
      @click="toggleSnap"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <span class="w-10 h-1.5 rounded-full bg-(--color-divider)"></span>
      <span class="text-xs font-medium text-(--color-text-2)">
        {{ props.jobCount }} {{ pluralize(props.jobCount, 'job') }} in view
      </span>
    </button>

    <div class="flex-1 min-h-0">
      <slot />
    </div>
  </div>
</template>
