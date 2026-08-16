/**
 * Wraps `fn` so a burst of calls only actually runs it once, `delayMs`
 * after the *last* call in the burst (trailing-edge debounce) -- e.g. so
 * typing in a search box doesn't re-run expensive downstream work (map
 * marker rebuilds) on every keystroke, only once typing pauses.
 *
 * Returns a `cancel()` alongside the wrapped function so callers can
 * discard a pending, not-yet-fired call (e.g. on unmount).
 */
export const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number
): { (...args: Args): void; cancel: () => void } => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const cancel = (): void => {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }

  const debounced = (...args: Args): void => {
    cancel()
    timeoutId = setTimeout(() => {
      timeoutId = undefined
      fn(...args)
    }, delayMs)
  }

  debounced.cancel = cancel
  return debounced
}
