import { describe, it, expect, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { useJobFilters } from '@/composables/useJobFilters'
import type { Job } from '@/types/types'

const jobAt = (overrides: Partial<Job>): Job => ({
  company: 'Acme',
  title: 'Engineer',
  location: 'Athens',
  techArea: 'Backend',
  url: 'https://x/default',
  ...overrides
})

describe('useJobFilters', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('derives jobCounts and filteredJobList from the input jobs, and applies tech-area filters', () => {
    const jobs = ref<Job[]>([
      jobAt({ title: 'Frontend Dev', techArea: 'Frontend', url: 'https://x/1' }),
      jobAt({ title: 'Backend Dev', techArea: 'Backend', url: 'https://x/2' })
    ])

    const { filteredJobList, jobCounts, toggleFilter } = useJobFilters(jobs)

    expect(filteredJobList.value).toHaveLength(2)
    expect(jobCounts.value.get('Frontend')).toBe(1)
    expect(jobCounts.value.get('Backend')).toBe(1)

    toggleFilter('Frontend')

    expect(filteredJobList.value.map((job) => job.title)).toEqual(['Frontend Dev'])
  })

  it('filters by free-text search across company/title/location', () => {
    const jobs = ref<Job[]>([
      jobAt({ company: 'Acme', title: 'Backend Dev', url: 'https://x/1' }),
      jobAt({
        company: 'Zenith',
        title: 'Frontend Dev',
        location: 'Thessaloniki',
        url: 'https://x/2'
      })
    ])

    const { filteredJobList, searchQuery } = useJobFilters(jobs)
    searchQuery.value = 'thessaloniki'

    expect(filteredJobList.value.map((job) => job.title)).toEqual(['Frontend Dev'])
  })

  it('classifies remote and unmappable jobs separately from the filtered list', () => {
    const jobs = ref<Job[]>([
      jobAt({ title: 'Remote role', location: 'Remote', url: 'https://x/1' }),
      jobAt({ title: 'Typo city', location: 'Definitely Not A Known City', url: 'https://x/2' }),
      jobAt({ title: 'Athens role', location: 'Athens', url: 'https://x/3' })
    ])

    const { remoteJobs, unmappableJobs, mappableJobs } = useJobFilters(jobs)

    expect(remoteJobs.value.map((job) => job.title)).toEqual(['Remote role'])
    expect(unmappableJobs.value.map((job) => job.title)).toEqual(['Typo city'])
    expect(mappableJobs.value.map((job) => job.title)).toEqual(['Athens role'])
  })

  it('rebuilds filters (preserving existing selections) when the underlying job list changes', async () => {
    const jobs = ref<Job[]>([jobAt({ techArea: 'Frontend', url: 'https://x/1' })])

    const { filters, toggleFilter } = useJobFilters(jobs)
    expect(filters.value.get('Frontend')).toBe(false)

    toggleFilter('Frontend')
    expect(filters.value.get('Frontend')).toBe(true)

    // A new job list introduces a new tech area; the existing Frontend
    // selection should survive the rebuild.
    jobs.value = [
      jobAt({ techArea: 'Frontend', url: 'https://x/1' }),
      jobAt({ techArea: 'Backend', url: 'https://x/2' })
    ]
    await nextTick()

    expect(filters.value.get('Frontend')).toBe(true)
    expect(filters.value.get('Backend')).toBe(false)
  })

  it('clearAllFilters resets all filters to false and clears the search query', () => {
    const jobs = ref<Job[]>([jobAt({ techArea: 'Frontend', url: 'https://x/1' })])
    const { filters, searchQuery, toggleFilter, clearAllFilters } = useJobFilters(jobs)

    toggleFilter('Frontend')
    searchQuery.value = 'dev'

    clearAllFilters()

    expect(filters.value.get('Frontend')).toBe(false)
    expect(searchQuery.value).toBe('')
  })
})
