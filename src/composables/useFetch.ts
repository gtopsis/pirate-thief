import { type Ref, ref, shallowRef, toValue } from 'vue'

export const useFetch = <T = unknown>(url: string | Ref<string>) => {
  const isLoading = ref(false)
  const error = shallowRef<Error | null>(null)
  const data: Ref<T | null> = ref(null)

  // Tracks the in-flight request (if any) so a repeat call -- e.g. the
  // user clicking "refresh" again before the first request resolves --
  // can cancel it. Without this, whichever response happens to arrive
  // last "wins" regardless of which request it belongs to, which can
  // leave `data`/`error` set from a stale, superseded fetch.
  let abortController: AbortController | null = null

  const fetchData = async () => {
    abortController?.abort()
    const controller = new AbortController()
    abortController = controller

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(toValue(url), { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
      }

      const json = await response.json()
      // Guard the success path too, not just the catch/finally below:
      // some environments resolve a fetch's promise successfully even
      // after its signal is aborted, rather than rejecting it -- without
      // this check, a slow, superseded request could still overwrite
      // `data` after a newer request has already started (or finished).
      if (controller.signal.aborted) return

      data.value = json
    } catch (err) {
      // A request that was deliberately aborted (because a newer call
      // superseded it) isn't a real error -- that newer call already owns
      // isLoading/error/data, so bail out without touching them.
      if (controller.signal.aborted) return

      error.value = err instanceof Error ? err : new Error(String(err))
      data.value = null
    } finally {
      if (!controller.signal.aborted) {
        isLoading.value = false
      }
    }
  }

  return { isLoading, error, data, fetchData }
}
