import L from 'leaflet'
import type { Job } from '@/types/types'
import { getJobCoords } from '@/utils/geo'

const buildHeatPoints = (jobs: readonly Job[]): L.HeatLatLngTuple[] => {
  const points: L.HeatLatLngTuple[] = []
  for (const job of jobs) {
    const coords = getJobCoords(job)
    if (!coords) continue
    points.push([coords[0], coords[1], 1])
  }
  return points
}

/**
 * Manages the density-heatmap layer, shown as an alternative to the
 * clustered marker view. Kept as its own unit so the map component
 * doesn't need to know about leaflet.heat's API or its failure modes
 * directly.
 *
 * The `leaflet.heat` plugin itself is only ever imported the first time
 * this layer is actually used (`update()`'s first call) -- most sessions
 * never open heatmap view at all, so importing and running the plugin's
 * side-effect setup eagerly at app startup would be pure waste for them.
 */
export const createHeatmapLayer = () => {
  let heatLayer: L.HeatLayer | null = null
  let heatPluginLoaded: Promise<void> | null = null

  const ensureHeatPluginLoaded = (): Promise<void> => {
    heatPluginLoaded ??= import('leaflet.heat').then(() => undefined)
    return heatPluginLoaded
  }

  const update = async (jobs: readonly Job[]): Promise<void> => {
    const points = buildHeatPoints(jobs)

    if (heatLayer) {
      heatLayer.setLatLngs(points)
      return
    }

    await ensureHeatPluginLoaded()
    heatLayer = L.heatLayer(points, { radius: 28, blur: 22, maxZoom: 12 })
  }

  const attachTo = (map: L.Map): void => {
    if (heatLayer && !map.hasLayer(heatLayer)) heatLayer.addTo(map)
  }

  /**
   * Detaches (if attached) and drops the current heat layer instance. A
   * heat layer that failed to fully initialize (e.g. no canvas support in
   * the test environment) can leave Leaflet's internal DOM bookkeeping
   * inconsistent, so removal errors are swallowed here -- a fresh layer
   * is created next time `update` runs.
   */
  const detachFrom = (map: L.Map): void => {
    if (!heatLayer) return
    try {
      if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer)
    } catch {
      // See doc comment above.
    }
    heatLayer = null
  }

  return { update, attachTo, detachFrom }
}
