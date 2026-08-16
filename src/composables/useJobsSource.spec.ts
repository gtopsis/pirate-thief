import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useJobsSource } from '@/composables/useJobsSource'

const HEADER_ROWS = Array.from({ length: 5 }, () => ['', '', '', '', ''])

// Job rows are [company, title, location, techArea, url].
const FRONTEND_JOB = ['Acme Corp', 'Senior Frontend Engineer', 'Athens', 'Frontend', 'https://x/1']
const BACKEND_JOB = ['Beta Ltd', 'Backend Engineer', 'Thessaloniki', 'Backend', 'https://x/2']

const stubJobsResponse = (jobRows: string[][]): void => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          majorDimension: 'ROWS',
          range: 'Jobs!A1:E100',
          values: [...HEADER_ROWS, ...jobRows]
        })
    })
  )
}

/**
 * useJobsSource uses lifecycle hooks internally (via useLastUpdatedText),
 * which require an active component instance to register -- so it's
 * called inside a trivial host component's setup(), per Vue's guidance
 * for testing composables.
 */
const withJobsSource = () => {
  let result!: ReturnType<typeof useJobsSource>
  const TestComponent = defineComponent({
    setup() {
      result = useJobsSource()
      return () => h('div')
    }
  })
  const wrapper = mount(TestComponent)
  return { result, unmount: () => wrapper.unmount() }
}

describe('useJobsSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts empty and populates jobs/lastUpdatedText after a successful refresh', async () => {
    stubJobsResponse([FRONTEND_JOB, BACKEND_JOB])
    const { result, unmount } = withJobsSource()

    expect(result.jobs.value).toEqual([])
    expect(result.isLoading.value).toBe(false)
    expect(result.lastUpdatedText.value).toBe('Jobs have not been fetched yet')

    await result.refresh()

    expect(result.jobs.value).toHaveLength(2)
    expect(result.jobs.value.map((job) => job.company)).toEqual(['Acme Corp', 'Beta Ltd'])
    expect(result.error.value).toBeNull()
    expect(result.lastUpdatedText.value).not.toBe('Jobs have not been fetched yet')

    unmount()
  })

  it('sets error state and logs on fetch failure, leaving jobs empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    )
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result, unmount } = withJobsSource()
    await result.refresh()

    expect(result.jobs.value).toEqual([])
    expect(result.error.value).toBeInstanceOf(Error)
    expect(consoleErrorSpy).toHaveBeenCalledWith(result.error.value)
    // Only the "time ago" ticking's data-fetch state should log -- the
    // last-updated text shouldn't advance on a failed fetch.
    expect(result.lastUpdatedText.value).toBe('Jobs have not been fetched yet')

    unmount()
  })
})
