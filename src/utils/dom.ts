const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

/**
 * Scrolls the job card matching `[data-job-id="<jobId>"]` into view (smoothly,
 * unless the user prefers reduced motion), and moves keyboard focus to its
 * primary link. No-op if the card isn't currently rendered (e.g. filtered
 * out of the current list) or if the environment doesn't implement
 * `scrollIntoView` (e.g. jsdom in tests).
 *
 * Used when a map marker click highlights a job in the list: without
 * moving focus too, a keyboard/screen-reader user's context wouldn't
 * follow the change the way a sighted user's does via the highlight ring
 * and scroll.
 */
export const scrollJobCardIntoView = (jobId: string): void => {
  const escapedId = typeof CSS !== 'undefined' ? CSS.escape(jobId) : jobId
  const card = document.querySelector(`[data-job-id="${escapedId}"]`)
  if (!card) return

  if (typeof card.scrollIntoView === 'function') {
    card.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center'
    })
  }

  const primaryLink = card.querySelector<HTMLElement>('a[href]')
  if (typeof primaryLink?.focus === 'function') {
    primaryLink.focus({ preventScroll: true })
  }
}
