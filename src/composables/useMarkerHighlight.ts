import type L from 'leaflet'

const HIGHLIGHT_CLASS = 'marker-highlighted'

/**
 * Tracks which single marker is currently "highlighted" (see the
 * `.marker-highlighted` style in JobsMap.vue) and keeps that CSS class in
 * sync as the highlighted job changes -- removing it from whichever
 * marker had it previously before adding it to the new one, so at most
 * one marker is ever highlighted at a time.
 *
 * Takes a getter (rather than the map itself) because the underlying
 * job-id -> marker registry is rebuilt (a new `Map` instance) every time
 * the job list changes; reading it lazily on each call keeps this always
 * looking at the current registry.
 */
export const useMarkerHighlight = (getMarkersByJobId: () => Map<string, L.Marker>) => {
  let highlightedMarker: L.Marker | null = null

  const applyHighlight = (jobId: string | null | undefined): void => {
    highlightedMarker?.getElement()?.classList.remove(HIGHLIGHT_CLASS)
    highlightedMarker = null

    if (!jobId) return

    const marker = getMarkersByJobId().get(jobId)
    if (!marker) return

    highlightedMarker = marker
    marker.getElement()?.classList.add(HIGHLIGHT_CLASS)
  }

  return { applyHighlight }
}
