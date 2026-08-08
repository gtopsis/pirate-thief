<script setup lang="ts">
import { computed } from 'vue'
import type { Job } from '@/types/types'
import FilterList from '@/components/FilterList.vue'
import JobList from '@/components/JobList.vue'
import JobListSkeleton from '@/components/JobListSkeleton.vue'
import RemoteJobsNotice from '@/components/RemoteJobsNotice.vue'
import UnmappedLocationsNotice from '@/components/UnmappedLocationsNotice.vue'
import { pluralize } from '@/utils/text'

const props = defineProps<{
  jobs: readonly Job[]
  totalJobCount: number
  isLoading: boolean
  error: boolean
  filters: Map<string, boolean>
  jobCounts: Map<string, number>
  searchQuery: string
  showAllOnMap: boolean
  isViewportFilterAvailable: boolean
  highlightedJobId: string | null
  unmappableJobs: readonly Job[]
  remoteJobs: readonly Job[]
}>()

const emit = defineEmits<{
  (e: 'filter:click', name: string): void
  (e: 'clear-filters'): void
  (e: 'update:search-query', value: string): void
  (e: 'update:show-all-on-map', value: boolean): void
  (e: 'job:select', jobId: string): void
  (e: 'job:hover', jobId: string | null): void
}>()

const onSearchInput = (event: Event): void => {
  emit('update:search-query', (event.target as HTMLInputElement).value)
}

// Only spells out "N of M" when the list is actually narrower than the
// total matches (i.e. the map viewport is hiding some of them) -- when
// they're equal, "N of N" adds nothing over just "N jobs".
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

      <label
        v-if="props.isViewportFilterAvailable"
        class="flex items-center gap-2 text-xs text-(--color-text-2) select-none cursor-pointer"
      >
        <input
          type="checkbox"
          :checked="props.showAllOnMap"
          class="cursor-pointer"
          @change="emit('update:show-all-on-map', ($event.target as HTMLInputElement).checked)"
        />
        Show all matching jobs (ignore map view)
      </label>

      <p class="text-xs text-(--color-text-3)">
        {{ jobCountText }}
      </p>

      <RemoteJobsNotice :jobs="props.remoteJobs" />
      <UnmappedLocationsNotice :jobs="props.unmappableJobs" />
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto px-3 py-3">
      <JobListSkeleton v-if="props.isLoading" />

      <p v-else-if="props.error" class="text-center my-4">
        Fetching jobs failed. Please try again later.
      </p>

      <div v-else-if="props.jobs.length === 0" class="text-center my-8">
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
