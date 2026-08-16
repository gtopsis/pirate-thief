import type { Job } from '@/types/types'
import type { JobsSourceAdapter } from '@/sources/types'

/**
 * Google Sheets API v4 "values.get" response shape -- see
 * https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets.values/get
 * Kept private to this module: nothing outside the adapter should need
 * to know the wire shape of whatever source is currently active.
 */
interface GoogleSheetsValuesResponse {
  majorDimension: string
  range: string
  values: string[][]
}

/** Narrows an unknown fetch response down to the shape toJobs() expects. */
const isGoogleSheetsValuesResponse = (raw: unknown): raw is GoogleSheetsValuesResponse =>
  typeof raw === 'object' && raw !== null && Array.isArray((raw as { values?: unknown }).values)

// The published sheet's first few rows are a title/instructions, not job data.
const NUMBER_OF_HEADER_ROWS = 5
// [company, title, location, techArea, url]
const NUMBER_OF_JOB_COLUMNS = 5

const rowToJob = (row: string[]): Job => ({
  company: row[0]!,
  title: row[1]!,
  location: row[2]!,
  techArea: row[3]!,
  url: row[4]!
})

/**
 * Transforms a raw Google Sheets "values.get" response into the app's
 * domain Job[]: skips the header rows, and defensively skips any row
 * that doesn't have exactly the expected number of columns (a published,
 * manually-edited spreadsheet can easily end up with blank/malformed
 * rows). Returns an empty array for anything that isn't a recognizable
 * values response at all (missing/malformed fetch result).
 */
const toJobs = (raw: unknown): Job[] => {
  if (!isGoogleSheetsValuesResponse(raw)) return []

  const jobs: Job[] = []
  for (let i = NUMBER_OF_HEADER_ROWS; i < raw.values.length; i++) {
    const row = raw.values[i]
    if (row && row.length === NUMBER_OF_JOB_COLUMNS) {
      jobs.push(rowToJob(row))
    }
  }
  return jobs
}

const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID
const apiKey = import.meta.env.VITE_GOOGLE_SPREADSHEET_API_KEY
const range = import.meta.env.VITE_GOOGLE_SPREADSHEET_API_RANGE

/**
 * The currently active JobsSourceAdapter: Startup Pirate's published
 * Google Sheet. This is the one place useJobsSource points at -- swap
 * this import for a different JobsSourceAdapter implementation to change
 * where the app's job data comes from.
 */
export const googleSheetsJobsSource: JobsSourceAdapter = {
  url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`,
  toJobs
}

// Exported for direct unit testing (see googleSheetsJobsSource.spec.ts) --
// not meant to be imported by app code outside this module.
export { rowToJob, toJobs, isGoogleSheetsValuesResponse }
export type { GoogleSheetsValuesResponse }
