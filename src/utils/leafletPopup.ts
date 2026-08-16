import type L from 'leaflet'
import { isMobileViewport } from '@/utils/viewport'

/**
 * Binds a popup to a marker, except on mobile viewports -- where tapping a
 * marker already expands the bottom sheet to the same job(s) in a much
 * roomier, scrollable view (see the `onMarkerClick` callback passed to
 * markerClusterLayer.ts/remoteJobsLayer.ts). Binding a popup too would just
 * duplicate that in a small overlay that can visually compete with the
 * sheet. Desktop has no such sheet, so the popup stays the primary
 * at-a-glance affordance there.
 */
export const bindPopupUnlessMobile = (marker: L.Marker, buildContent: () => string): void => {
  if (isMobileViewport()) return
  marker.bindPopup(buildContent())
}
