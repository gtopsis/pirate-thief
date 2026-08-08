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
  (e: 'clear-search'): void
  (e: 'clear-filter', name: string): void
  (e: 'clear-map-focus'): void
  (e: 'clear-all'): void
}>()

const hasSearch = computed(() => props.searchQuery.trim().length > 0)

const activeFilterNames = computed(() =>
  Array.from(props.filters.entries())
    .filter(([, isActive]) => isActive)
    .map(([name]) => name)
)

// Deliberately null for 'area' (the default) -- only deviations from the
// default map/list relationship are worth calling out here. 'point' and
// 'all' are both explicit overrides the user took an action to reach.
const mapFocusPillLabel = computed(() => {
  if (props.mapFocus === 'point') return `📍 ${props.selectedLocationName ?? ''}`
  if (props.mapFocus === 'all') return '🌐 All jobs (map ignored)'
  return null
})

const hasAnyActive = computed(
  () => hasSearch.value || activeFilterNames.value.length > 0 || mapFocusPillLabel.value !== null
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
      v-if="hasSearch"
      type="button"
      :aria-label="`Clear search: ${props.searchQuery}`"
      class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-(--color-bg-mute) ring-1 ring-inset ring-(--color-divider) hover:opacity-80 cursor-pointer"
      @click="emit('clear-search')"
    >
      <span>&quot;{{ props.searchQuery }}&quot;</span>
      <span aria-hidden="true">&times;</span>
    </button>

    <button
      v-for="name in activeFilterNames"
      :key="name"
      type="button"
      :aria-label="`Clear filter: ${name}`"
      class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-(--color-bg-mute) ring-1 ring-inset ring-(--color-divider) hover:opacity-80 cursor-pointer"
      @click="emit('clear-filter', name)"
    >
      <span>{{ name }}</span>
      <span aria-hidden="true">&times;</span>
    </button>

    <button
      v-if="mapFocusPillLabel"
      type="button"
      aria-label="Reset to the default map view"
      class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-(--color-bg-mute) ring-1 ring-inset ring-(--color-divider) hover:opacity-80 cursor-pointer"
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
