<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import AppHero from '@/components/AppHero.vue'
import JobPanel from '@/components/JobPanel.vue'
import JobsMap from '@/components/JobsMap.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import RefreshButton from '@/components/RefreshButton.vue'
import { useJobsSource } from '@/composables/useJobsSource'
import { useJobFilters } from '@/composables/useJobFilters'
import { useMapView } from '@/composables/useMapView'
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

// === Cross-cutting: job selection (shared between the list and the map) ===
const activeJobId = ref<string | null>(null)
const jobsMapRef = ref<InstanceType<typeof JobsMap> | null>(null)
const bottomSheetRef = ref<InstanceType<typeof BottomSheet> | null>(null)

// Per-tech-area job counts shown on each filter pill -- narrowed by
// search always, and also by the map's current viewport whenever synced
// to it ('area'/'point' focus; 'all' means the sync toggle is off, so
// counts aren't narrowed by the map at all). Deliberately NOT narrowed by
// which tech-area filters happen to be active: each pill's count answers
// "how many would match if I picked this one", given the current
// search/map state alone -- not compounded with whatever's already
// selected, which is exactly why this builds on searchedJobList (search
// only) rather than filteredJobList (search + active tech-area filters).
const jobsForFilterCounts = computed(() =>
  mapFocus.value === 'all'
    ? searchedJobList.value
    : filterJobsByBounds(searchedJobList.value, mapBounds.value)
)
const jobCounts = computed(() => countJobsByTechArea(jobsForFilterCounts.value))

// The single "how many jobs am I looking at" label, shared by the
// desktop sidebar and the mobile bottom sheet's persistent handle (see
// JobPanel's/BottomSheet's jobCountText props) -- computed once here so
// there's exactly one such message, worded one way. Tracks panelJobList
// (not filteredJobList): when synced to the map ('area'/'point' focus),
// that's exactly what's currently presented on the map/list, so this
// updates live as the map is panned/zoomed, not just when search/filters
// change. When unsynced ('all' focus), panelJobList already equals
// filteredJobList, so this naturally shows everything in that case. The
// remote and couldn't-be-placed subsets are separately, plainly called
// out right below it (see RemoteJobsNotice/UnmappedLocationsNotice) --
// those are pan/zoom-independent (remote/unmappable jobs have no
// coordinates to be in or out of view), so they intentionally keep
// tracking filteredJobList instead.
const jobCountText = computed(() => formatJobCountText(panelJobList.value.length))

// Grouped so the desktop panel and mobile bottom sheet can both bind the
// same JobPanel props with a single `v-bind`, instead of repeating every
// prop at both call sites.
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
  // Avoid redundant work (and, more importantly, an unwanted map pan) when
  // this job is already the active one -- e.g. scrollJobCardIntoView's
  // focus() call (for keyboard/screen-reader users) re-triggers this same
  // handler for a job a marker click just selected; re-flying to it would
  // fire a bounds-changed event that immediately reverts Point map focus
  // right after selectLocation() set it.
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

// Resets search, tech-area filters, and map focus back to their
// defaults in one action -- powers both the "Clear all" action in the
// active-filters bar and the empty-state "Clear all filters" button.
const clearEverything = (): void => {
  clearAllFilters()
  clearMapFocusOverride()
}

// === Keyboard Navigation ===
// 'r'/'h' require Alt so they're exempt from WCAG 2.1.4 (Character Key
// Shortcuts), which applies only to shortcuts using nothing but a bare
// letter/punctuation/number/symbol key -- Escape is a named
// (non-printable) key, so it isn't covered by 2.1.4 and is left bare,
// matching its conventional "cancel/clear" meaning.
const handleKeydown = (event: KeyboardEvent): void => {
  // Ignore if user is typing in an input
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return
  }

  switch (event.key.toLowerCase()) {
    case 'r':
      if (event.altKey && !isLoading.value) {
        handleRefresh()
      }
      break
    case 'h':
      if (event.altKey) {
        jobsMapRef.value?.toggleViewMode()
      }
      break
    case 'escape':
      if (hasActiveFilters.value || searchQuery.value || mapFocus.value !== 'area') {
        clearEverything()
      }
      break
  }
}

// === Lifecycle ===
onMounted(async () => {
  await refresh()

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
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
        class="hidden md:flex md:flex-col md:w-[420px] lg:w-[460px] shrink-0 border-r border-(--color-divider) bg-(--color-bg)"
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
      <div class="flex-1 min-w-0 relative">
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
