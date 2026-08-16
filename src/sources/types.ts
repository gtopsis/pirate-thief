import type { Job } from '@/types/types'

/**
 * The single contract useJobsSource depends on: an endpoint to fetch raw
 * job data from, plus a pure transform from that source's raw response
 * into the app's domain Job[]. To point the app at a different job data
 * source, write a new object satisfying this interface (see
 * src/sources/googleSheets) and swap the import in useJobsSource.ts.
 */
export interface JobsSourceAdapter {
  url: string
  /**
   * Transforms this source's raw response into the app's domain Job[].
   * `raw` is untyped on purpose -- implementations must defensively
   * validate its shape rather than assume it matches what they expect,
   * and return an empty array for anything they don't recognize.
   */
  toJobs: (raw: unknown) => Job[]
}
