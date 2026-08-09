<script setup lang="ts">
import type { Job } from '@/types/types'
import type { MapFocus } from '@/composables/useMapView'
import ActiveFiltersBar from '@/components/ActiveFiltersBar.vue'
import FilterList from '@/components/FilterList.vue'
import JobList from '@/components/JobList.vue'
import JobListSkeleton from '@/components/JobListSkeleton.vue'
import RemoteJobsNotice from '@/components/RemoteJobsNotice.vue'
import UnmappedLocationsNotice from '@/components/UnmappedLocationsNotice.vue'

const props = withDefaults(
  defineProps<{
    jobs: readonly Job[]
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
     * The single "how many jobs am I looking at" label (see
     * utils/text.ts's formatJobCountText) -- computed once by the parent
     * (HomeView) from the same shown/total counts used everywhere else,
     * so this panel and the mobile bottom sheet's persistent handle
     * always agree, instead of each formatting their own similar-but-not
     * -quite-identical text.
     */
    jobCountText: string
    /**
     * Whether this panel instance should render `jobCountText` itself.
     * False when embedded in the mobile bottom sheet, whose own handle
     * already shows this same label persistently (in every snap state,
     * including collapsed) -- rendering it a second time here once the
     * sheet reaches its "full" (non-compact) state would just repeat the
     * exact same information right below it. True (default) for the
     * desktop sidebar, which has no such persistent handle of its own.
     */
    showJobCountText?: boolean
    /**
     * Hides secondary/administrative controls (the job-count text and the
     * remote/unmapped notices), keeping only the sync-with-map toggle,
     * search, filters, and the active-filters bar + the list itself.
     * Used for the mobile bottom sheet's "half" (quick-glance) state,
     * where those pieces would otherwise eat into the little space
     * available for the list. Defaults to false so the desktop panel
     * (which has no such space constraint) always shows everything.
     */
    compact?: boolean
  }>(),
  { compact: false, showJobCountText: true }
)

const emit = defineEmits<{
  (e: 'filter:click', name: string): void
  (e: 'clear-filters'): void
  (e: 'update:search-query', value: string): void
  (e: 'update:sync', synced: boolean): void
  (e: 'clear-map-focus'): void
  (e: 'job:select', jobId: string): void
  (e: 'job:hover', jobId: string | null): void
}>()

const onSearchInput = (event: Event): void => {
  emit('update:search-query', (event.target as HTMLInputElement).value)
}

const onSyncToggleChange = (event: Event): void => {
  emit('update:sync', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="shrink-0 flex flex-col gap-2 px-3 pt-3 pb-2 border-b border-(--color-divider)">
      <!-- 1st: establishes the scope everything below operates within
           (synced to the current map view, or every matching job
           regardless of pan/zoom) -- shown even when compact, since it's
           foundational rather than secondary. -->
      <label
        v-if="props.isViewportFilterAvailable"
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

      <!-- 2nd: search -->
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

      <!-- 3rd: filters -->
      <FilterList
        :filters="props.filters"
        :job-counts="props.jobCounts"
        @filter:click="emit('filter:click', $event)"
      />

      <!-- 4th: textual content derived from all of the above (sync/map
           focus, search, filters) -- what's currently narrowing the view,
           a way to undo any one of them (or all at once), and how many
           jobs that leaves. Always visible (even compact): the single
           canonical place to see this, so it can't disagree with the
           actual search/filter/sync state shown above it. -->
      <ActiveFiltersBar
        :filters="props.filters"
        :search-query="props.searchQuery"
        :map-focus="props.mapFocus"
        :selected-location-name="props.selectedLocationName"
        @clear-map-focus="emit('clear-map-focus')"
        @clear-all="emit('clear-filters')"
      />

      <p
        v-if="!props.compact && props.showJobCountText"
        aria-live="polite"
        aria-atomic="true"
        class="text-xs text-(--color-text-3)"
      >
        {{ props.jobCountText }}
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
