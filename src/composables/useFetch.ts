import { type Ref, ref, shallowRef, toValue } from 'vue'

export const useFetch = <T>(url: string | Ref<string>) => {
  const isLoading = ref(false)
  const error = shallowRef<Error | null>(null)
  const data: Ref<T | null> = ref(null)

  const fetchData = async () => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(toValue(url))
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`)
      }

      data.value = await response.json()
    } catch (err) {
      console.error(err)
      error.value = err instanceof Error ? err : new Error(String(err))

      data.value = null
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, error, data, fetchData }
}
