const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

/**
 * Scrolls the job card matching `[data-job-id="<jobId>"]` into view
 * (smoothly, unless reduced motion is preferred) and moves keyboard focus
 * to its primary link -- so a keyboard/screen-reader user's context
 * follows a map marker click the same way a sighted user's does via the
 * highlight ring and scroll. No-op if the card isn't currently rendered.
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
