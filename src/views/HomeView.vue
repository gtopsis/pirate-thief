<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import AppHero from '@/components/AppHero.vue'
import JobPanel from '@/components/JobPanel.vue'
import JobsMap from '@/components/JobsMap.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useJobsSource } from '@/composables/useJobsSource'
import { useJobFilters } from '@/composables/useJobFilters'
import { useMapView } from '@/composables/useMapView'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { scrollJobCardIntoView } from '@/utils/dom'
import { filterJobsByBounds, getJobId } from '@/utils/geo'
import { countJobsByTechArea } from '@/utils/jobs'
import { formatJobCountText } from '@/utils/text'
import type { Job } from '@/types/types'

// === Module 1: spreadsheet/data source ===
const {
  jobs: validJobList,
  isLoading,
  error,
  lastUpdatedText: jobsLastUpdatedText,
  refresh
} = useJobsSource()

// === Module 2: job list handling (filters, search, classification) ===
const {
  filters,
  searchQuery,
  hasActiveFilters,
  searchedJobList,
  filteredJobList,
  unmappableJobs,
  remoteJobs,
  toggleFilter,
  clearAllFilters
} = useJobFilters(validJobList)

// === Module 3: map view state (bounds, MapFocus, viewport narrowing, URL sync) ===
const {
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
} = useMapView(filteredJobList)

const activeJobId = ref<string | null>(null)
const jobsMapRef = ref<InstanceType<typeof JobsMap> | null>(null)
const bottomSheetRef = ref<InstanceType<typeof BottomSheet> | null>(null)

// Each pill's count answers "how many would match if I picked this one",
// given the current search/map state alone -- so it builds on
// searchedJobList (search only), not filteredJobList (search + active
// tech-area filters), and isn't narrowed by which filters are active.
const jobsForFilterCounts = computed(() =>
  mapFocus.value === 'all'
    ? searchedJobList.value
    : filterJobsByBounds(searchedJobList.value, mapBounds.value)
)
const jobCounts = computed(() => countJobsByTechArea(jobsForFilterCounts.value))

// The single "how many jobs am I looking at" label, shared by the
// desktop sidebar and the mobile bottom sheet's persistent handle.
// Tracks panelJobList (not filteredJobList) so it updates live as the
// map is panned/zoomed while synced, not just on search/filter changes.
const jobCountText = computed(() => formatJobCountText(panelJobList.value.length))

// Grouped so the desktop panel and mobile bottom sheet can both bind the
// same JobPanel props with a single `v-bind`.
const jobPanelProps = computed(() => ({
  jobs: panelJobList.value,
  jobCountText: jobCountText.value,
  isLoading: isLoading.value,
  error: !!error.value,
  filters: filters.value,
  jobCounts: jobCounts.value,
  searchQuery: searchQuery.value,
  mapFocus: mapFocus.value,
  selectedLocationName: selectedLocationName.value,
  isViewportFilterAvailable: isViewportFilterAvailable.value,
  highlightedJobId: activeJobId.value,
  unmappableJobs: unmappableJobs.value,
  remoteJobs: remoteJobs.value
}))

const handleJobHover = (jobId: string | null): void => {
  activeJobId.value = jobId
}

const handleJobSelect = (jobId: string): void => {
  // Avoid an unwanted map pan when this job is already active -- e.g.
  // scrollJobCardIntoView's focus() call re-triggers this handler for a
  // job a marker click just selected; re-flying to it would fire a
  // bounds-changed event that immediately reverts Point map focus right
  // after selectLocation() set it.
  if (activeJobId.value === jobId) return

  activeJobId.value = jobId
  jobsMapRef.value?.flyToJob(jobId)
}

const handleMarkerClick = (jobs: Job[]): void => {
  const firstJob = jobs[0]
  if (!firstJob) return

  const jobId = getJobId(firstJob)
  activeJobId.value = jobId
  selectLocation(jobs)
  bottomSheetRef.value?.expand()
  nextTick(() => scrollJobCardIntoView(jobId))
}

const handleRefresh = (): Promise<void> => refresh()

// Powers both the "Clear all" action in the active-filters bar and the
// empty-state "Clear all filters" button.
const clearEverything = (): void => {
  clearAllFilters()
  clearMapFocusOverride()
}

useKeyboardShortcuts([
  { key: 'r', altKey: true, isEnabled: () => !isLoading.value, handler: handleRefresh },
  { key: 'h', altKey: true, handler: () => jobsMapRef.value?.toggleViewMode() },
  {
    key: 'escape',
    isEnabled: () => hasActiveFilters.value || !!searchQuery.value || mapFocus.value !== 'area',
    handler: clearEverything
  }
])

onMounted(async () => {
  await refresh()
})
</script>

<template>
  <div class="app-shell h-[100dvh] w-full flex flex-col overflow-hidden bg-(--color-bg)">
    <!-- Mobile topbar only -- on desktop this same content lives inside
         the sidebar below instead of a separate full-width header row. -->
    <header
      class="md:hidden shrink-0 flex flex-col gap-1 px-4 py-2 border-b border-(--color-divider)"
    >
      <AppHero compact />

      <div class="flex justify-center items-center gap-2">
        <p aria-live="polite" aria-atomic="true" class="text-xs text-(--color-text-3)">
          {{ jobsLastUpdatedText }}
        </p>
        <RefreshButton :is-loading="isLoading" @click="handleRefresh" />
      </div>
    </header>

    <main class="flex-1 min-h-0 relative flex flex-col md:flex-row">
      <!-- Desktop sidebar: branding/refresh header + the job panel, as the
           one persistent column alongside the map (the app's only other
           top-level region on desktop -- see the main view below). -->
      <aside
        class="hidden md:flex md:flex-col md:w-[420px] lg:w-[460px] md:h-full md:max-h-full md:min-h-0 shrink-0 border-r border-(--color-divider) bg-(--color-bg)"
      >
        <div class="shrink-0 flex flex-col gap-1 px-4 py-3 border-b border-(--color-divider)">
          <div class="flex items-center justify-between gap-2">
            <AppHero compact />
            <RefreshButton :is-loading="isLoading" @click="handleRefresh" />
          </div>
          <p aria-live="polite" aria-atomic="true" class="text-xs text-(--color-text-3)">
            {{ jobsLastUpdatedText }}
          </p>
        </div>

        <JobPanel
          v-bind="jobPanelProps"
          class="flex-1 min-h-0"
          @filter:click="toggleFilter"
          @clear-filters="clearEverything"
          @update:search-query="searchQuery = $event"
          @update:sync="setSynced"
          @clear-map-focus="clearMapFocusOverride"
          @job:select="handleJobSelect"
          @job:hover="handleJobHover"
        />
      </aside>

      <!-- Main view: the map fills the remaining space on every device -->
      <div class="flex-1 min-w-0 h-full max-h-full relative">
        <JobsMap
          ref="jobsMapRef"
          :jobs="filteredJobList"
          :remote-jobs="remoteJobs"
          :highlighted-job-id="activeJobId"
          :initial-view="initialMapView"
          class="absolute inset-0"
          @bounds-changed="handleBoundsChanged"
          @marker-click="handleMarkerClick"
          @view-changed="handleViewChanged"
        />

        <!-- Mobile bottom sheet mirrors the same panel. Its handle shows
             jobCountText persistently (every snap state), so the panel
             itself is told not to repeat it (showJobCountText). Only the
             "full" snap state shows every other control (see JobPanel's
             `compact` prop) -- "half" stays focused on search + filters
             + the list. -->
        <BottomSheet ref="bottomSheetRef" :job-count-text="jobCountText">
          <template #default="{ isFull }">
            <JobPanel
              v-bind="jobPanelProps"
              :compact="!isFull"
              :show-job-count-text="false"
              @filter:click="toggleFilter"
              @clear-filters="clearEverything"
              @update:search-query="searchQuery = $event"
              @update:sync="setSynced"
              @clear-map-focus="clearMapFocusOverride"
              @job:select="handleJobSelect"
              @job:hover="handleJobHover"
            />
          </template>
        </BottomSheet>
      </div>
    </main>
  </div>
</template>
