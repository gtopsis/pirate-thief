import { computed, ref, shallowRef } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { Job } from '@/types/types'
import { filterJobsByBounds } from '@/utils/geo'
import type { MapBounds } from '@/utils/geo'
import { getMapViewFromUrl, setMapViewInUrl } from '@/utils/urlState'
import type { UrlMapView } from '@/utils/urlState'

/**
 * How the job list panel relates to the map, from least to most specific.
 * This is *derived* (see the `mapFocus` computed below), not primary
 * state -- the real state is `isSynced` plus whichever marker (if any)
 * was last clicked.
 *  - 'all':   every matching job, regardless of the map's pan/zoom --
 *             sync is off.
 *  - 'area':  only jobs within the current map viewport (the default).
 *  - 'point': only the job(s) at one specific location, set by clicking a
 *             map marker. Falls back to 'area' as soon as the user moves
 *             the map themselves (see handleBoundsChanged).
 */
export type MapFocus = 'all' | 'area' | 'point'

/**
 * Owns the map's reactive view state and the job list derived from it.
 * JobsMap.vue owns actual rendering; this is just what its props/events
 * plug into.
 *
 * Two independent things narrow the list, on top of search/tech-area
 * filters (which this composable doesn't know about): a clicked marker
 * (`selectedLocationJobs`) and the map's current viewport (`mapBounds`).
 * Both are gated by a single `isSynced` toggle ("Sync list with map
 * view"): while it's off, neither narrows the list -- clicking a marker
 * still *remembers* it, it just has no effect until sync is turned back
 * on, at which point it resumes exactly where it left off.
 */
export const useMapView = (filteredJobList: Ref<Job[]> | ComputedRef<Job[]>) => {
  const mapBounds = shallowRef<MapBounds | null>(null)
  const isSynced = ref(true)
  // Kept even while unsynced (see the class doc above) -- only *applied*
  // to the list while synced.
  const selectedLocationJobs = shallowRef<Job[] | null>(null)

  const isViewportFilterAvailable = computed(() => mapBounds.value !== null)

  const mapFocus = computed<MapFocus>(() => {
    if (!isSynced.value) return 'all'
    return selectedLocationJobs.value ? 'point' : 'area'
  })

  const selectedLocationName = computed(() =>
    mapFocus.value === 'point' ? (selectedLocationJobs.value?.[0]?.location ?? null) : null
  )

  // Restore a previously shared/persisted map center+zoom, if present in
  // the URL. Read once at setup time (not reactive).
  const initialMapView: UrlMapView | null = getMapViewFromUrl()

  const panelJobList = computed(() => {
    if (mapFocus.value === 'point') return selectedLocationJobs.value ?? filteredJobList.value
    if (mapFocus.value === 'area') return filterJobsByBounds(filteredJobList.value, mapBounds.value)
    return filteredJobList.value
  })

  const handleBoundsChanged = (bounds: MapBounds): void => {
    mapBounds.value = bounds

    // The user just moved the map themselves -- fall back to following
    // the (new) viewport instead of staying pinned to a pin selection
    // that's no longer necessarily relevant.
    if (mapFocus.value === 'point') {
      selectedLocationJobs.value = null
    }
  }

  const handleViewChanged = (view: UrlMapView): void => {
    setMapViewInUrl(view)
  }

  const selectLocation = (jobs: Job[]): void => {
    selectedLocationJobs.value = jobs
  }

  // Deliberately leaves `selectedLocationJobs` untouched -- toggling sync
  // back on resumes exactly where it left off, rather than losing it.
  const setSynced = (synced: boolean): void => {
    isSynced.value = synced
  }

  // Unlike setSynced, this is a deliberate "start over" (used by "Clear
  // all" and the Map Focus pill's clear action), so the marker selection
  // isn't preserved.
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
