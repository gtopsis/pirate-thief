import { describe, it, expect } from 'vitest'
import {
  filterJobsByBounds,
  getMappableJobs,
  getRemoteJobs,
  getUnmappableJobs,
  GREECE_CENTER,
  isRemoteLocation
} from '@/utils/geo'
import type { MapBounds } from '@/utils/geo'
import type { Job } from '@/types/types'

const jobAt = (location: string): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location,
  techArea: 'Backend',
  url: 'https://x'
})

describe('isRemoteLocation', () => {
  it.each(['Remote', 'Remote, Greece', 'Fully Remote', 'REMOTE', 'Greece', 'greece'])(
    'returns true for "%s"',
    (location) => {
      expect(isRemoteLocation(location)).toBe(true)
    }
  )

  it.each(['Athens', 'Athens (Remote)', 'Remote-work friendly Athens office', 'Unknown City'])(
    'returns false for "%s" (resolves to a city, or has no "remote" keyword)',
    (location) => {
      expect(isRemoteLocation(location)).toBe(false)
    }
  )

  it.each(['Remote, Athens', 'Kifisia, Attica, Greece'])(
    'returns false for "%s" (a real, resolvable city takes precedence over "remote"/"Greece")',
    (location) => {
      expect(isRemoteLocation(location)).toBe(false)
    }
  )

  it.each(['Unknown Place, Attica, Greece', 'Unknown Place, Greece'])(
    'returns false for "%s" (an unresolved place name isn\'t the same as "Greece"/"Remote" alone)',
    (location) => {
      expect(isRemoteLocation(location)).toBe(false)
    }
  )
})

describe('getUnmappableJobs', () => {
  it('returns only jobs whose location could not be geocoded and are not remote listings', () => {
    const jobs = [
      jobAt('Athens'),
      jobAt('Definitely Not A Known City'),
      jobAt('Remote'),
      jobAt('Thessaloniki')
    ]

    const unmappable = getUnmappableJobs(jobs)

    expect(unmappable.map((job) => job.location)).toEqual(['Definitely Not A Known City'])
  })

  it('returns an empty array when every job is mappable', () => {
    const jobs = [jobAt('Athens'), jobAt('Thessaloniki')]

    expect(getUnmappableJobs(jobs)).toEqual([])
  })
})

describe('getRemoteJobs', () => {
  it('returns only remote job listings', () => {
    const jobs = [
      jobAt('Athens'),
      jobAt('Definitely Not A Known City'),
      jobAt('Remote'),
      jobAt('Athens (Remote)'),
      jobAt('Greece'),
      jobAt('Kifisia, Attica, Greece'),
      jobAt('Thessaloniki')
    ]

    const remote = getRemoteJobs(jobs)

    expect(remote.map((job) => job.location)).toEqual(['Remote', 'Greece'])
  })

  it('returns an empty array when no jobs are remote', () => {
    const jobs = [jobAt('Athens'), jobAt('Thessaloniki')]

    expect(getRemoteJobs(jobs)).toEqual([])
  })
})

describe('getMappableJobs', () => {
  it('returns only jobs that resolve to a specific place on the map -- excluding both remote and genuinely-unmappable jobs', () => {
    const jobs = [
      jobAt('Athens'),
      jobAt('Definitely Not A Known City'),
      jobAt('Remote'),
      jobAt('Thessaloniki')
    ]

    const mappable = getMappableJobs(jobs)

    expect(mappable.map((job) => job.location)).toEqual(['Athens', 'Thessaloniki'])
  })

  it('returns an empty array when every job is remote or unmappable', () => {
    const jobs = [jobAt('Remote'), jobAt('Definitely Not A Known City')]

    expect(getMappableJobs(jobs)).toEqual([])
  })

  it('every job falls into exactly one of getMappableJobs/getRemoteJobs/getUnmappableJobs', () => {
    const jobs = [
      jobAt('Athens'),
      jobAt('Definitely Not A Known City'),
      jobAt('Remote'),
      jobAt('Thessaloniki'),
      jobAt('Greece')
    ]

    const total =
      getMappableJobs(jobs).length + getRemoteJobs(jobs).length + getUnmappableJobs(jobs).length

    expect(total).toBe(jobs.length)
  })
})

describe('filterJobsByBounds', () => {
  // Athens is at ~[37.98, 23.73]; GREECE_CENTER (where the remote-jobs
  // marker is always drawn, see remoteJobsLayer.ts) is at ~[39.07, 21.82].
  const BOUNDS_AROUND_ATHENS_ONLY: MapBounds = { north: 38.1, south: 37.9, east: 23.8, west: 23.6 }
  const BOUNDS_AROUND_ATHENS_AND_GREECE_CENTER: MapBounds = {
    north: 39.5,
    south: 37.5,
    east: 24,
    west: 21.5
  }
  const BOUNDS_AROUND_NEITHER: MapBounds = { north: 41, south: 40.5, east: 23, west: 22.5 }

  it('returns every job unfiltered when bounds are null', () => {
    const jobs = [jobAt('Athens'), jobAt('Remote')]

    expect(filterJobsByBounds(jobs, null)).toEqual(jobs)
  })

  it('includes a mappable job only when its coordinates fall within the given bounds', () => {
    const athens = jobAt('Athens')

    expect(filterJobsByBounds([athens], BOUNDS_AROUND_ATHENS_ONLY)).toEqual([athens])
    expect(filterJobsByBounds([athens], BOUNDS_AROUND_NEITHER)).toEqual([])
  })

  it('excludes genuinely-unmappable jobs regardless of bounds (they have no coordinates at all)', () => {
    const jobs = [jobAt('Definitely Not A Known City')]

    expect(filterJobsByBounds(jobs, BOUNDS_AROUND_ATHENS_AND_GREECE_CENTER)).toEqual([])
  })

  it("includes remote jobs when the current view contains the remote marker's fixed location (Greece's center)", () => {
    const remote = jobAt('Remote')

    expect(filterJobsByBounds([remote], BOUNDS_AROUND_ATHENS_AND_GREECE_CENTER)).toEqual([remote])
  })

  it("excludes remote jobs when the current view does not contain the remote marker's fixed location", () => {
    const remote = jobAt('Remote')

    // Athens-only bounds happen to exclude GREECE_CENTER too.
    expect(filterJobsByBounds([remote], BOUNDS_AROUND_ATHENS_ONLY)).toEqual([])
    expect(filterJobsByBounds([remote], BOUNDS_AROUND_NEITHER)).toEqual([])
  })

  it('surfaces both a city pin and the remote marker when both are within view (the reported bug)', () => {
    const athens = jobAt('Athens')
    const remote = jobAt('Remote')

    const result = filterJobsByBounds([athens, remote], BOUNDS_AROUND_ATHENS_AND_GREECE_CENTER)

    expect(result).toEqual([athens, remote])
  })

  it("sanity-checks the fixture bounds actually (don't) contain GREECE_CENTER as intended", () => {
    const [lat, lng] = GREECE_CENTER
    const inRange = (bounds: MapBounds) =>
      lat <= bounds.north && lat >= bounds.south && lng >= bounds.west && lng <= bounds.east

    expect(inRange(BOUNDS_AROUND_ATHENS_AND_GREECE_CENTER)).toBe(true)
    expect(inRange(BOUNDS_AROUND_ATHENS_ONLY)).toBe(false)
    expect(inRange(BOUNDS_AROUND_NEITHER)).toBe(false)
  })
})
