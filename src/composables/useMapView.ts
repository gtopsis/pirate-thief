import { computed, ref, shallowRef } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Job } from '@/types/types'
import { filterJobsByBounds } from '@/utils/geo'
import type { MapBounds } from '@/utils/geo'
import { getMapViewFromUrl, setMapViewInUrl } from '@/utils/urlState'
import type { UrlMapView } from '@/utils/urlState'

/**
 * How the job list panel relates to the map, from least to most specific.
 * This is a *derived* display value (see the `mapFocus` computed below),
 * not primary state -- the real state is `isSynced` (the "Sync list with
 * map view" toggle) plus whichever marker (if any) was last clicked; see
 * those for the actual filtering rules.
 *  - 'all':   every matching job, regardless of the map's pan/zoom --
 *             sync is off.
 *  - 'area':  only jobs within the current map viewport (the default --
 *             the list follows the map as the user pans/zooms).
 *  - 'point': only the job(s) at one specific location, set by clicking a
 *             map marker. Strictly more specific than 'area', and
 *             automatically falls back to it as soon as the user moves
 *             the map themselves (see handleBoundsChanged).
 */
export type MapFocus = 'all' | 'area' | 'point'

/**
 * Owns the map's reactive view state and the job list derived from it.
 * This is the state layer only -- JobsMap.vue (and its Leaflet layer
 * factories) own actual rendering; this is just what its props/events
 * plug into.
 *
 * Two independent things narrow the list, on top of search/tech-area
 * filters (which this composable doesn't know about at all):
 *  1. a clicked marker (`selectedLocationJobs`) -- the most specific.
 *  2. the map's current viewport (`mapBounds`).
 * ...gated by a single `isSynced` toggle ("Sync list with map view"):
 * while it's off, neither one narrows the list at all -- clicking a
 * marker still *remembers* it (`selectedLocationJobs` isn't cleared), it
 * just has no effect on the list until sync is turned back on, at which
 * point it resumes exactly where it left off.
 */
export const useMapView = (filteredJobList: Ref<Job[]> | ComputedRef<Job[]>) => {
  const mapBounds = shallowRef<MapBounds | null>(null)
  const isSynced = ref(true)
  // The exact jobs at the marker last clicked. Kept even while unsynced
  // (see the class doc above) -- only *applied* to the list while synced.
  const selectedLocationJobs = shallowRef<Job[] | null>(null)

  const isViewportFilterAvailable = computed(() => mapBounds.value !== null)

  // The effective, mutually-exclusive focus level -- derived from
  // isSynced + selectedLocationJobs, purely for display (the "Sync list
  // with map view" checkbox, the Map Focus pill) and for panelJobList's
  // own branching below.
  const mapFocus = computed<MapFocus>(() => {
    if (!isSynced.value) return 'all'
    return selectedLocationJobs.value ? 'point' : 'area'
  })

  // The clicked location's name, for display (e.g. "Athens") -- null
  // unless mapFocus is currently 'point'.
  const selectedLocationName = computed(() =>
    mapFocus.value === 'point' ? (selectedLocationJobs.value?.[0]?.location ?? null) : null
  )

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
      selectedLocationJobs.value = null
    }
  }

  const handleViewChanged = (view: UrlMapView): void => {
    setMapViewInUrl(view)
  }

  /**
   * Remember the clicked marker's jobs as the location filter. Only
   * takes effect on the list while synced (see mapFocus/panelJobList
   * above) -- while unsynced, this is stored but has no visible effect
   * until sync is turned back on, at which point it applies immediately.
   */
  const selectLocation = (jobs: Job[]): void => {
    selectedLocationJobs.value = jobs
  }

  /**
   * Turns the "Sync list with map view" toggle on/off. Deliberately
   * leaves `selectedLocationJobs` untouched either way -- toggling sync
   * back on resumes exactly where it left off (that marker, if one was
   * selected; otherwise the current viewport), rather than losing it.
   */
  const setSynced = (synced: boolean): void => {
    isSynced.value = synced
  }

  /**
   * Fully resets any map-driven override: clears a selected marker and
   * ensures sync is on, back to the plain viewport-following default.
   * Used by "Clear all" and the Map Focus pill's own clear action --
   * unlike setSynced, this is a deliberate "start over", so the
   * marker selection isn't preserved.
   */
  const clearMapFocusOverride = (): void => {
    selectedLocationJobs.value = null
    isSynced.value = true
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
    setSynced,
    clearMapFocusOverride
  }
}
