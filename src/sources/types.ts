import type { Job } from '@/types/types'

/**
 * The single contract useJobsSource depends on: an endpoint to fetch raw
 * job data from, plus a pure transform from that source's raw response
 * into the app's domain Job[].
 *
 * To point the app at a different job data source, write a new object
 * satisfying this interface (see src/sources/googleSheets for the
 * current implementation) and swap the import in useJobsSource.ts --
 * nothing downstream (filtering, the map, search, etc.) needs to know or
 * care where the data actually comes from or how it's shaped on the wire.
 */
export interface JobsSourceAdapter {
  /** Endpoint to fetch the raw response from. */
  url: string
  /**
   * Transforms this source's raw response into the app's domain Job[].
   * `raw` is untyped on purpose -- it's whatever `JSON.parse` produced,
   * so implementations must defensively validate its shape rather than
   * assume it matches what they expect, and return an empty array for
   * anything they don't recognize.
   */
  toJobs: (raw: unknown) => Job[]
}
