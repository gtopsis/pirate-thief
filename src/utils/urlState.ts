// === Shared URL read/write helpers ===

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

// === Filter State ===
const FILTER_PARAM = 'filters'

/**
 * Parse active filters from URL search params
 */
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

/**
 * Update URL with active filters (without page reload)
 */
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

/**
 * Apply URL filters to a filters Map
 */
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

// === Map View State ===
const MAP_LAT_PARAM = 'lat'
const MAP_LNG_PARAM = 'lng'
const MAP_ZOOM_PARAM = 'z'

export interface UrlMapView {
  lat: number
  lng: number
  zoom: number
}

/**
 * Parse a persisted map center/zoom from the URL search params, if present
 * and valid.
 */
export const getMapViewFromUrl = (): UrlMapView | null => {
  const params = readUrlParams()
  const lat = Number(params.get(MAP_LAT_PARAM))
  const lng = Number(params.get(MAP_LNG_PARAM))
  const zoom = Number(params.get(MAP_ZOOM_PARAM))

  if ([lat, lng, zoom].some((value) => !Number.isFinite(value))) return null

  return { lat, lng, zoom }
}

/**
 * Persist the current map center/zoom in the URL (without page reload),
 * so the view can be shared/restored.
 */
export const setMapViewInUrl = (view: UrlMapView): void => {
  writeUrlParams((params) => {
    params.set(MAP_LAT_PARAM, view.lat.toFixed(4))
    params.set(MAP_LNG_PARAM, view.lng.toFixed(4))
    params.set(MAP_ZOOM_PARAM, String(view.zoom))
  })
}
