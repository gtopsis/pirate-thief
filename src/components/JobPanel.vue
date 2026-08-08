<script setup lang="ts">
import { computed } from 'vue'
import type { Job } from '@/types/types'
import type { MapFocus } from '@/composables/useMapView'
import ActiveFiltersBar from '@/components/ActiveFiltersBar.vue'
import FilterList from '@/components/FilterList.vue'
import JobList from '@/components/JobList.vue'
import JobListSkeleton from '@/components/JobListSkeleton.vue'
import RemoteJobsNotice from '@/components/RemoteJobsNotice.vue'
import UnmappedLocationsNotice from '@/components/UnmappedLocationsNotice.vue'
import { pluralize } from '@/utils/text'

const props = withDefaults(
  defineProps<{
    jobs: readonly Job[]
    totalJobCount: number
    isLoading: boolean
    error: boolean
    filters: Map<string, boolean>
    jobCounts: Map<string, number>
    searchQuery: string
    mapFocus: MapFocus
    selectedLocationName: string | null
    isViewportFilterAvailable: boolean
    highlightedJobId: string | null
    unmappableJobs: readonly Job[]
    remoteJobs: readonly Job[]
    /**
     * Hides secondary/administrative controls (the map-sync toggle, the
     * redundant job-count line, and the remote/unmapped notices), keeping
     * only search + filters + the active-filters bar + the list itself.
     * Used for the mobile bottom sheet's "half" (quick-glance) state,
     * where those pieces would otherwise eat into the little space
     * available for the list. Defaults to false so the desktop panel
     * (which has no such space constraint) always shows everything.
     */
    compact?: boolean
  }>(),
  { compact: false }
)

const emit = defineEmits<{
  (e: 'filter:click', name: string): void
  (e: 'clear-filters'): void
  (e: 'update:search-query', value: string): void
  (e: 'follow-map-area'): void
  (e: 'show-all-jobs'): void
  (e: 'job:select', jobId: string): void
  (e: 'job:hover', jobId: string | null): void
}>()

const onSearchInput = (event: Event): void => {
  emit('update:search-query', (event.target as HTMLInputElement).value)
}

const onSyncToggleChange = (event: Event): void => {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) {
    emit('follow-map-area')
  } else {
    emit('show-all-jobs')
  }
}

// Only spells out "N of M" when the list is actually narrower than the
// total matches (i.e. the current map focus is hiding some of them) --
// when they're equal, "N of N" adds nothing over just "N jobs".
const jobCountText = computed(() => {
  const { length } = props.jobs
  return length === props.totalJobCount
    ? `${length} ${pluralize(length, 'job')}`
    : `Showing ${length} of ${props.totalJobCount} jobs`
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="shrink-0 flex flex-col gap-2 px-3 pt-3 pb-2 border-b border-(--color-divider)">
      <label class="relative block">
        <span class="sr-only">Search jobs by title, company or location</span>
        <input
          type="search"
          :value="props.searchQuery"
          placeholder="Search title, company or location..."
          class="w-full rounded-lg py-2 pl-3 pr-3 text-sm bg-(--color-bg-mute) border border-(--color-divider) focus:outline-none focus:ring-2 focus:ring-(--vt-c-blue-dark)"
          @input="onSearchInput"
        />
      </label>

      <FilterList
        :filters="props.filters"
        :job-counts="props.jobCounts"
        @filter:click="emit('filter:click', $event)"
      />

      <!-- Always visible (even compact): the single canonical place to see
           everything currently narrowing the view, and undo any one of
           them individually or all at once. -->
      <ActiveFiltersBar
        :filters="props.filters"
        :search-query="props.searchQuery"
        :map-focus="props.mapFocus"
        :selected-location-name="props.selectedLocationName"
        @clear-map-focus="emit('follow-map-area')"
        @clear-all="emit('clear-filters')"
      />

      <label
        v-if="props.isViewportFilterAvailable && !props.compact"
        class="flex items-center gap-2 text-xs text-(--color-text-2) select-none cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="props.mapFocus !== 'all'"
          class="cursor-pointer"
          @change="onSyncToggleChange"
        />
        Sync list with map view
      </label>

      <p
        v-if="!props.compact"
        aria-live="polite"
        aria-atomic="true"
        class="text-xs text-(--color-text-3)"
      >
        {{ jobCountText }}
      </p>

      <template v-if="!props.compact">
        <RemoteJobsNotice :jobs="props.remoteJobs" />
        <UnmappedLocationsNotice :jobs="props.unmappableJobs" />
      </template>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-3 py-3">
      <JobListSkeleton v-if="props.isLoading" />

      <p v-else-if="props.error" role="alert" class="text-center my-4">
        Fetching jobs failed. Please try again later.
      </p>

      <div v-else-if="props.jobs.length === 0" role="status" class="text-center my-8">
        <p class="text-base text-(--color-text-2) mb-2">No jobs match</p>
        <p class="text-sm text-(--color-text-3) mb-4">
          Try a different search, tech area, or pan/zoom the map
        </p>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium rounded-lg bg-(--vt-c-blue-dark) text-white hover:opacity-90 transition-opacity cursor-pointer"
          @click="emit('clear-filters')"
        >
          Clear all filters
        </button>
      </div>

      <JobList
        v-else
        :jobs="props.jobs"
        :highlighted-job-id="props.highlightedJobId"
        @job:select="emit('job:select', $event)"
        @job:hover="emit('job:hover', $event)"
      />
    </div>
  </div>
</template>
