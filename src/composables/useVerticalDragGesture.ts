import { ref } from 'vue'

export interface VerticalDragGestureOptions {
  /** Starting ratio (0-1) for the gesture's internal `ratio` ref. */
  initialRatio: number
  /**
   * Height (px) that a full 0 -> 1 ratio range maps across. Read fresh on
   * every pointermove so an in-progress drag stays correct even if the
   * viewport resizes mid-gesture.
   */
  getViewportHeight: () => number
  /** Inclusive ratio bounds the dragged value is clamped to while moving. */
  min: number
  max: number
  /** Below this much vertical pointer movement (px), the gesture is treated as a tap rather than a drag. Defaults to 10px. */
  dragThresholdPx?: number
  /**
   * Called once the pointer is released/cancelled, with the final ratio
   * and whether the movement exceeded `dragThresholdPx` (a real drag, as
   * opposed to a stationary tap the caller may want to handle differently).
   */
  onRelease: (ratio: number, wasDrag: boolean) => void
}

const DEFAULT_DRAG_THRESHOLD_PX = 10

/**
 * Low-level vertical drag gesture: pointer capture, delta-to-ratio
 * conversion, threshold-based tap-vs-drag detection, and ratio clamping.
 * Deliberately knows nothing about snap points or any other domain
 * concept -- callers (e.g. BottomSheet.vue) own what a given ratio means
 * and what to do once the gesture ends.
 */
export const useVerticalDragGesture = (options: VerticalDragGestureOptions) => {
  const threshold = options.dragThresholdPx ?? DEFAULT_DRAG_THRESHOLD_PX

  const isDragging = ref(false)
  const ratio = ref(options.initialRatio)

  let dragStartY = 0
  let dragStartRatio = 0
  let hasDraggedPastThreshold = false

  const onPointerDown = (event: PointerEvent): void => {
    isDragging.value = true
    hasDraggedPastThreshold = false
    dragStartY = event.clientY
    dragStartRatio = ratio.value
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (!isDragging.value) return

    const deltaY = dragStartY - event.clientY
    if (Math.abs(deltaY) > threshold) {
      hasDraggedPastThreshold = true
    }

    const deltaRatio = deltaY / options.getViewportHeight()
    const nextRatio = dragStartRatio + deltaRatio
    ratio.value = Math.min(options.max, Math.max(options.min, nextRatio))
  }

  const onPointerUp = (): void => {
    if (!isDragging.value) return
    isDragging.value = false
    options.onRelease(ratio.value, hasDraggedPastThreshold)
  }

  return { isDragging, ratio, onPointerDown, onPointerMove, onPointerUp }
}
