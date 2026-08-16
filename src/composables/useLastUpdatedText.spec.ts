import { describe, it, expect, vi, afterEach } from 'vitest'
import { useLastUpdatedText } from '@/composables/useLastUpdatedText'

describe('useLastUpdatedText', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with a not-yet-fetched message', () => {
    const { lastUpdatedText } = useLastUpdatedText(false)

    expect(lastUpdatedText.value).toBe('Jobs have not been fetched yet')
  })

  it('updates the text immediately when markUpdatedNow is called', () => {
    const { lastUpdatedText, markUpdatedNow } = useLastUpdatedText(false)

    markUpdatedNow()

    expect(lastUpdatedText.value).toMatch(/^Fetched .+ ago from /)
  })

  it('can be used outside a component lifecycle (autoRefresh: false), with start()/stop() managed manually', () => {
    vi.useFakeTimers()
    const { lastUpdatedText, markUpdatedNow, start, stop } = useLastUpdatedText(false)

    markUpdatedNow()
    const textAfterUpdate = lastUpdatedText.value

    // No interval running yet -- the text shouldn't change just from time
    // passing, since nothing has called start().
    vi.advanceTimersByTime(5 * 60_000)
    expect(lastUpdatedText.value).toBe(textAfterUpdate)

    start()
    vi.advanceTimersByTime(60_000)
    expect(lastUpdatedText.value).not.toBe(textAfterUpdate)

    const textAfterTick = lastUpdatedText.value
    stop()
    vi.advanceTimersByTime(5 * 60_000)
    // Stopped -- no further ticks should change the text.
    expect(lastUpdatedText.value).toBe(textAfterTick)
  })
})
