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
import { getJobId } from '@/utils/geo'
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
  jobCounts,
  hasActiveFilters,
  filteredJobList,
  unmappableJobs,
  remoteJobs,
  toggleFilter,
  clearAllFilters
} = useJobFilters(validJobList)

// === Module 3: map view state (bounds, MapFocus, viewport narrowing, URL sync) ===
const {
  mapFocus,
  selectedLocationName,
  isViewportFilterAvailable,
  initialMapView,
  panelJobList,
  handleBoundsChanged,
  handleViewChanged,
  selectLocation,
  showAllJobs,
  followMapArea
} = useMapView(filteredJobList)

// === Cross-cutting: job selection (shared between the list and the map) ===
const activeJobId = ref<string | null>(null)
const jobsMapRef = ref<InstanceType<typeof JobsMap> | null>(null)
const bottomSheetRef = ref<InstanceType<typeof BottomSheet> | null>(null)

// Grouped so the desktop panel and mobile bottom sheet can both bind the
// same JobPanel props with a single `v-bind`, instead of repeating every
// prop at both call sites.
const jobPanelProps = computed(() => ({
  jobs: panelJobList.value,
  totalJobCount: filteredJobList.value.length,
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
  followMapArea()
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
        class="hidden md:flex md:flex-col md:w-[380px] lg:w-[420px] shrink-0 border-r border-(--color-divider) bg-(--color-bg)"
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
          @follow-map-area="followMapArea"
          @show-all-jobs="showAllJobs"
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

        <!-- Mobile bottom sheet mirrors the same panel. Only the "full"
             snap state shows every control (see JobPanel's `compact`
             prop) -- "half" stays focused on search + filters + the list. -->
        <BottomSheet ref="bottomSheetRef" :job-count="panelJobList.length">
          <template #default="{ isFull }">
            <JobPanel
              v-bind="jobPanelProps"
              :compact="!isFull"
              @filter:click="toggleFilter"
              @clear-filters="clearEverything"
              @update:search-query="searchQuery = $event"
              @follow-map-area="followMapArea"
              @show-all-jobs="showAllJobs"
              @job:select="handleJobSelect"
              @job:hover="handleJobHover"
            />
          </template>
        </BottomSheet>
      </div>
    </main>
  </div>
</template>
