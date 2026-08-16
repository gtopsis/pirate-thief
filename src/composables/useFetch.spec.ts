import { describe, it, expect, vi, afterEach } from 'vitest'
import { useFetch } from '@/composables/useFetch'

describe('useFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts idle, then populates data on a successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ hello: 'world' }) })
    )

    const { isLoading, error, data, fetchData } = useFetch('https://x/jobs')

    expect(isLoading.value).toBe(false)
    expect(data.value).toBeNull()

    await fetchData()

    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(data.value).toEqual({ hello: 'world' })
  })

  it('sets error and clears data on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    )

    const { error, data, fetchData } = useFetch('https://x/jobs')
    await fetchData()

    expect(error.value).toBeInstanceOf(Error)
    expect(data.value).toBeNull()
  })

  it('sets error on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const { error, data, fetchData } = useFetch('https://x/jobs')
    await fetchData()

    expect(error.value).toBeInstanceOf(Error)
    expect(data.value).toBeNull()
  })

  it('aborts a still-in-flight request when fetchData is called again, keeping only the latest result', async () => {
    let resolveFirst!: (value: unknown) => void
    let firstSignal: AbortSignal | undefined
    let secondSignal: AbortSignal | undefined

    const fetchMock = vi
      .fn()
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        firstSignal = init?.signal ?? undefined
        return new Promise((resolve) => {
          resolveFirst = resolve
        })
      })
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        secondSignal = init?.signal ?? undefined
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'second' }) })
      })
    vi.stubGlobal('fetch', fetchMock)

    const { isLoading, error, data, fetchData } = useFetch('https://x/jobs')

    const firstCall = fetchData()
    const secondCall = fetchData()

    expect(firstSignal?.aborted).toBe(true)
    expect(secondSignal?.aborted).toBe(false)

    // The first request settles *successfully* after being superseded --
    // simulating an environment where an aborted fetch's promise still
    // resolves rather than rejects. It must still be ignored: the
    // `controller.signal.aborted` guard around the success path (not
    // just catch/finally) is what makes this the case.
    resolveFirst({ ok: true, json: () => Promise.resolve({ id: 'first' }) })

    await Promise.all([firstCall, secondCall])

    expect(data.value).toEqual({ id: 'second' })
    expect(error.value).toBeNull()
    expect(isLoading.value).toBe(false)
  })
})
