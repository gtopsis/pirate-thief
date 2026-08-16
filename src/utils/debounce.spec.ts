import { describe, it, expect, vi, afterEach } from 'vitest'
import { debounce } from '@/utils/debounce'

describe('debounce', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("only calls the wrapped function once after a burst of calls, with the last call's arguments", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced('a')
    debounced('b')
    debounced('c')
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('resets the delay on every call (trailing edge only)', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced('a')
    vi.advanceTimersByTime(150)
    expect(fn).not.toHaveBeenCalled()

    debounced('b')
    vi.advanceTimersByTime(150)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('runs the function again for a later, separate burst', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced('a')
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)

    debounced('b')
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith('b')
  })

  it('cancel() discards a pending call', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced('a')
    debounced.cancel()
    vi.advanceTimersByTime(200)

    expect(fn).not.toHaveBeenCalled()
  })
})
