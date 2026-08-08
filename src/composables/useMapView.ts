import { computed, ref, shallowRef } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Job } from '@/types/types'
import { filterJobsByBounds } from '@/utils/geo'
import type { MapBounds } from '@/utils/geo'
import { getMapViewFromUrl, setMapViewInUrl } from '@/utils/urlState'
import type { UrlMapView } from '@/utils/urlState'

/**
 * Owns the map's reactive view state: the current viewport bounds, the
 * "show all matching jobs" toggle, the persisted initial view (read once
 * from the URL), and the viewport-narrowed job list derived from them.
 * This is the state layer only -- JobsMap.vue (and its Leaflet layer
 * factories) own actual rendering; this is just what its props/events
 * plug into.
 */
export const useMapView = (filteredJobList: Ref<Job[]> | ComputedRef<Job[]>) => {
  const mapBounds = shallowRef<MapBounds | null>(null)
  // Default to showing every matching job in the list regardless of the
  // current map viewport (safer default: doesn't depend on the map having
  // settled into a meaningful viewport yet, and avoids surprising users
  // with an empty list on load). Users can opt in to narrowing the list
  // down to only what's currently visible on the map.
  const showAllOnMap = ref(true)

  const isViewportFilterAvailable = computed(() => mapBounds.value !== null)

  // Restore a previously shared/persisted map center+zoom, if present in
  // the URL. Read once at setup time (not reactive).
  const initialMapView: UrlMapView | null = getMapViewFromUrl()

  // Jobs shown in the list panel: narrowed down to the current map
  // viewport, unless the user opted to see all matching jobs regardless
  // of pan/zoom.
  const panelJobList = computed(() =>
    showAllOnMap.value
      ? filteredJobList.value
      : filterJobsByBounds(filteredJobList.value, mapBounds.value)
  )

  const handleBoundsChanged = (bounds: MapBounds): void => {
    mapBounds.value = bounds
  }

  const handleViewChanged = (view: UrlMapView): void => {
    setMapViewInUrl(view)
  }

  return {
    mapBounds,
    showAllOnMap,
    isViewportFilterAvailable,
    initialMapView,
    panelJobList,
    handleBoundsChanged,
    handleViewChanged
  }
}
