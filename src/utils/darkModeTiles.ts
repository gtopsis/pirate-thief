import L from 'leaflet'

const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

/**
 * Manages the base tile layer, switching between light/dark CARTO
 * basemaps to follow the OS/browser's `prefers-color-scheme`.
 */
export const createDarkModeTileLayer = () => {
  let tileLayer: L.TileLayer | null = null
  const darkModeQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null

  const apply = (map: L.Map, isDark: boolean): void => {
    if (tileLayer) {
      map.removeLayer(tileLayer)
    }

    tileLayer = L.tileLayer(isDark ? DARK_TILE_URL : LIGHT_TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20
    })
    tileLayer.addTo(map)
  }

  /**
   * Applies the initial tile layer and starts listening for
   * `prefers-color-scheme` changes. Returns a cleanup function that stops
   * listening -- call it when the owning map is torn down.
   */
  const attachTo = (map: L.Map): (() => void) => {
    apply(map, darkModeQuery?.matches ?? false)

    const handleChange = (event: MediaQueryListEvent): void => {
      apply(map, event.matches)
    }
    darkModeQuery?.addEventListener('change', handleChange)

    return () => darkModeQuery?.removeEventListener('change', handleChange)
  }

  return { attachTo }
}
