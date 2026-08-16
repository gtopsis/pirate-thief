const readUrlParams = (): URLSearchParams => new URLSearchParams(window.location.search)

/**
 * Applies `mutate` to a copy of the current URL's search params, then
 * writes the result back to the address bar without a page reload/history
 * entry. Centralizes the read-URL/mutate/replaceState dance shared by all
 * the URL-persisted state below.
 */
const writeUrlParams = (mutate: (params: URLSearchParams) => void): void => {
  const url = new URL(window.location.href)
  mutate(url.searchParams)
  window.history.replaceState({}, '', url.toString())
}

const FILTER_PARAM = 'filters'

export const getFiltersFromUrl = (): Set<string> => {
  const filterParam = readUrlParams().get(FILTER_PARAM)

  if (!filterParam) return new Set()

  return new Set(
    filterParam
      .split(',')
      .map((f) => decodeURIComponent(f.trim()))
      .filter(Boolean)
  )
}

export const setFiltersInUrl = (activeFilters: Set<string>): void => {
  writeUrlParams((params) => {
    if (activeFilters.size === 0) {
      params.delete(FILTER_PARAM)
    } else {
      params.set(
        FILTER_PARAM,
        Array.from(activeFilters)
          .map((f) => encodeURIComponent(f))
          .join(',')
      )
    }
  })
}

export const applyUrlFiltersToMap = (
  filters: Map<string, boolean>,
  urlFilters: Set<string>
): Map<string, boolean> => {
  const newFilters = new Map<string, boolean>()

  for (const [key] of filters) {
    newFilters.set(key, urlFilters.has(key))
  }

  return newFilters
}

const MAP_LAT_PARAM = 'lat'
const MAP_LNG_PARAM = 'lng'
const MAP_ZOOM_PARAM = 'z'

export interface UrlMapView {
  lat: number
  lng: number
  zoom: number
}

export const getMapViewFromUrl = (): UrlMapView | null => {
  const params = readUrlParams()
  const rawLat = params.get(MAP_LAT_PARAM)
  const rawLng = params.get(MAP_LNG_PARAM)
  const rawZoom = params.get(MAP_ZOOM_PARAM)

  // Distinct from "present but not a valid number" below: a param that's
  // simply absent (e.g. a first-ever visit) must not silently become 0 --
  // `Number(null)` is 0, which is finite, so without this check a missing
  // param set would be mistaken for a genuine "centered at [0, 0], zoom 0"
  // view instead of "no persisted view at all".
  if (rawLat === null || rawLng === null || rawZoom === null) return null

  const lat = Number(rawLat)
  const lng = Number(rawLng)
  const zoom = Number(rawZoom)

  if ([lat, lng, zoom].some((value) => !Number.isFinite(value))) return null

  return { lat, lng, zoom }
}

export const setMapViewInUrl = (view: UrlMapView): void => {
  writeUrlParams((params) => {
    params.set(MAP_LAT_PARAM, view.lat.toFixed(4))
    params.set(MAP_LNG_PARAM, view.lng.toFixed(4))
    params.set(MAP_ZOOM_PARAM, String(view.zoom))
  })
}
