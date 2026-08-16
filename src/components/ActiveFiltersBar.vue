<script setup lang="ts">
import { computed } from 'vue'
import type { MapFocus } from '@/composables/useMapView'

const props = defineProps<{
  filters: Map<string, boolean>
  searchQuery: string
  mapFocus: MapFocus
  selectedLocationName: string | null
}>()

const emit = defineEmits<{
  (e: 'clear-map-focus'): void
  (e: 'clear-all'): void
}>()

// This bar exists only for state that has nowhere else to be seen: tech-
// area filters and search already have their own always-visible UI
// (FilterList, the search input), so duplicating them here would be
// redundant. Shows the current Map Focus (see useMapView) plus a single
// "Clear all" reset covering everything at once.
const hasSearch = computed(() => props.searchQuery.trim().length > 0)
const hasActiveFilter = computed(() => Array.from(props.filters.values()).some(Boolean))

// Deliberately null for 'area' (the default) -- only deviations from the
// default map/list relationship are worth calling out here.
const mapFocusPillLabel = computed(() => {
  if (props.mapFocus === 'point') return `📍 ${props.selectedLocationName ?? ''}`
  if (props.mapFocus === 'all') return '🌐 All jobs (map ignored)'
  return null
})

const hasAnyActive = computed(
  () => hasSearch.value || hasActiveFilter.value || mapFocusPillLabel.value !== null
)
</script>

<template>
  <div
    v-if="hasAnyActive"
    role="group"
    aria-label="Active filters"
    class="flex flex-wrap items-center gap-1.5 text-xs"
  >
    <button
      v-if="mapFocusPillLabel"
      type="button"
      aria-label="Reset to the default map view"
      class="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 bg-(--color-bg-mute) ring-1 ring-inset ring-(--color-divider) hover:opacity-80 cursor-pointer"
      @click="emit('clear-map-focus')"
    >
      <span>{{ mapFocusPillLabel }}</span>
      <span aria-hidden="true">&times;</span>
    </button>

    <button
      type="button"
      class="ml-auto text-(--color-text-3) underline hover:text-(--color-text-2) cursor-pointer"
      @click="emit('clear-all')"
    >
      Clear all
    </button>
  </div>
</template>
