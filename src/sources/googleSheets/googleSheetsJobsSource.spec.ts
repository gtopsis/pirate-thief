import { describe, it, expect } from 'vitest'
import { rowToJob, toJobs } from '@/sources/googleSheets/googleSheetsJobsSource'

const HEADER_ROWS = Array.from({ length: 5 }, () => ['', '', '', '', ''])

// Job rows are [company, title, location, techArea, url].
const FRONTEND_JOB = ['Acme Corp', 'Senior Frontend Engineer', 'Athens', 'Frontend', 'https://x/1']
const BACKEND_JOB = ['Beta Ltd', 'Backend Engineer', 'Thessaloniki', 'Backend', 'https://x/2']

const responseWith = (values: string[][]) => ({
  majorDimension: 'ROWS',
  range: 'Jobs!A1:E100',
  values
})

describe('rowToJob', () => {
  it('maps a raw row to a Job by position', () => {
    expect(rowToJob(FRONTEND_JOB)).toEqual({
      company: 'Acme Corp',
      title: 'Senior Frontend Engineer',
      location: 'Athens',
      techArea: 'Frontend',
      url: 'https://x/1'
    })
  })
})

describe('toJobs', () => {
  it('skips the header rows and maps the rest to Job[]', () => {
    const jobs = toJobs(responseWith([...HEADER_ROWS, FRONTEND_JOB, BACKEND_JOB]))

    expect(jobs).toHaveLength(2)
    expect(jobs.map((job) => job.company)).toEqual(['Acme Corp', 'Beta Ltd'])
  })

  it('skips rows with the wrong number of columns', () => {
    const tooFewColumns = ['Acme Corp', 'Engineer', 'Athens']
    const tooManyColumns = [...FRONTEND_JOB, 'unexpected extra column']

    const jobs = toJobs(responseWith([...HEADER_ROWS, tooFewColumns, tooManyColumns, BACKEND_JOB]))

    expect(jobs.map((job) => job.company)).toEqual(['Beta Ltd'])
  })

  it('skips sparse/missing rows within values', () => {
    // eslint-disable-next-line no-sparse-arrays
    const values = [...HEADER_ROWS, , FRONTEND_JOB]

    expect(toJobs(responseWith(values as string[][])).map((job) => job.company)).toEqual([
      'Acme Corp'
    ])
  })

  it('treats a header-shaped row within the header range as a header, even if it has 5 columns', () => {
    // The header-skip is purely index-based -- rows before
    // NUMBER_OF_HEADER_ROWS are never inspected for content, even if
    // they happen to have exactly 5 columns.
    const headerRowsShapedLikeJobs = Array.from({ length: 5 }, () => FRONTEND_JOB)

    expect(toJobs(responseWith([...headerRowsShapedLikeJobs, BACKEND_JOB]))).toEqual([
      expect.objectContaining({ company: 'Beta Ltd' })
    ])
  })

  it('returns an empty array when there are no job rows past the header', () => {
    expect(toJobs(responseWith(HEADER_ROWS))).toEqual([])
  })

  it.each([null, undefined, {}, { values: 'not-an-array' }, 'a string', 42, []])(
    'returns an empty array for an unrecognizable raw response: %j',
    (raw) => {
      expect(toJobs(raw)).toEqual([])
    }
  )
})
