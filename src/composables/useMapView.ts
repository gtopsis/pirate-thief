import { computed, ref, shallowRef } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Job } from '@/types/types'
import { filterJobsByBounds } from '@/utils/geo'
import type { MapBounds } from '@/utils/geo'
import { getMapViewFromUrl, setMapViewInUrl } from '@/utils/urlState'
import type { UrlMapView } from '@/utils/urlState'

/**
 * How the job list panel relates to the map, from least to most specific:
 *  - 'all':   every matching job, regardless of the map's pan/zoom.
 *  - 'area':  only jobs within the current map viewport (the default --
 *             the list follows the map as the user pans/zooms).
 *  - 'point': only the job(s) at one specific location, set by clicking a
 *             map marker. Strictly more specific than 'area', and
 *             automatically falls back to it as soon as the user moves
 *             the map themselves (see handleBoundsChanged).
 */
export type MapFocus = 'all' | 'area' | 'point'

/**
 * Owns the map's reactive view state: the current viewport bounds, the
 * three-level MapFocus (all/area/point), the persisted initial view (read
 * once from the URL), and the job list derived from all of it. This is
 * the state layer only -- JobsMap.vue (and its Leaflet layer factories)
 * own actual rendering; this is just what its props/events plug into.
 */
export const useMapView = (filteredJobList: Ref<Job[]> | ComputedRef<Job[]>) => {
  const mapBounds = shallowRef<MapBounds | null>(null)
  const mapFocus = ref<MapFocus>('area')
  // The exact jobs at the marker last clicked, while mapFocus is 'point'.
  const selectedLocationJobs = shallowRef<Job[] | null>(null)

  const isViewportFilterAvailable = computed(() => mapBounds.value !== null)

  // The clicked location's name, for display (e.g. "Athens") -- null
  // unless mapFocus is currently 'point'.
  const selectedLocationName = computed(() => selectedLocationJobs.value?.[0]?.location ?? null)

  // Restore a previously shared/persisted map center+zoom, if present in
  // the URL. Read once at setup time (not reactive).
  const initialMapView: UrlMapView | null = getMapViewFromUrl()

  // Jobs shown in the list panel, narrowed according to the current
  // MapFocus level (see the MapFocus type doc above).
  const panelJobList = computed(() => {
    if (mapFocus.value === 'point') return selectedLocationJobs.value ?? filteredJobList.value
    if (mapFocus.value === 'area') return filterJobsByBounds(filteredJobList.value, mapBounds.value)
    return filteredJobList.value
  })

  const handleBoundsChanged = (bounds: MapBounds): void => {
    mapBounds.value = bounds

    // The user just moved the map themselves -- treat that as
    // intentionally moving on from a specific pin selection, falling
    // back to following the (new) viewport instead of staying pinned to
    // a location that's no longer necessarily relevant.
    if (mapFocus.value === 'point') {
      mapFocus.value = 'area'
      selectedLocationJobs.value = null
    }
  }

  const handleViewChanged = (view: UrlMapView): void => {
    setMapViewInUrl(view)
  }

  /** Narrow the list to exactly the jobs at a clicked marker. */
  const selectLocation = (jobs: Job[]): void => {
    mapFocus.value = 'point'
    selectedLocationJobs.value = jobs
  }

  /** Show every matching job, ignoring the map entirely. */
  const showAllJobs = (): void => {
    mapFocus.value = 'all'
    selectedLocationJobs.value = null
  }

  /** Back to the default: follow the current map viewport. */
  const followMapArea = (): void => {
    mapFocus.value = 'area'
    selectedLocationJobs.value = null
  }

  return {
    mapBounds,
    mapFocus,
    selectedLocationName,
    isViewportFilterAvailable,
    initialMapView,
    panelJobList,
    handleBoundsChanged,
    handleViewChanged,
    selectLocation,
    showAllJobs,
    followMapArea
  }
}
