/**
 * Smoothly scrolls the job card matching `[data-job-id="<jobId>"]` into
 * view, if it's currently rendered. No-op if it isn't found (e.g. filtered
 * out of the current list).
 */
export const scrollJobCardIntoView = (jobId: string): void => {
  const escapedId = typeof CSS !== 'undefined' ? CSS.escape(jobId) : jobId
  document
    .querySelector(`[data-job-id="${escapedId}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
