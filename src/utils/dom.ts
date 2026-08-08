/**
 * Smoothly scrolls the job card matching `[data-job-id="<jobId>"]` into
 * view, if it's currently rendered. No-op if it isn't found (e.g. filtered
 * out of the current list) or if the environment doesn't implement
 * `scrollIntoView` (e.g. jsdom in tests).
 */
export const scrollJobCardIntoView = (jobId: string): void => {
  const escapedId = typeof CSS !== 'undefined' ? CSS.escape(jobId) : jobId
  const element = document.querySelector(`[data-job-id="${escapedId}"]`)

  if (typeof element?.scrollIntoView === 'function') {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
