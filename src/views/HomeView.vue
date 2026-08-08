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

// === Module 3: map view state (bounds, viewport narrowing, URL sync) ===
const {
  showAllOnMap,
  isViewportFilterAvailable,
  initialMapView,
  panelJobList,
  handleBoundsChanged,
  handleViewChanged
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
  showAllOnMap: showAllOnMap.value,
  isViewportFilterAvailable: isViewportFilterAvailable.value,
  highlightedJobId: activeJobId.value,
  unmappableJobs: unmappableJobs.value,
  remoteJobs: remoteJobs.value
}))

const handleJobHover = (jobId: string | null): void => {
  activeJobId.value = jobId
}

const handleJobSelect = (jobId: string): void => {
  activeJobId.value = jobId
  jobsMapRef.value?.flyToJob(jobId)
}

const handleMarkerClick = (jobs: Job[]): void => {
  const firstJob = jobs[0]
  if (!firstJob) return

  const jobId = getJobId(firstJob)
  activeJobId.value = jobId
  bottomSheetRef.value?.expand()
  nextTick(() => scrollJobCardIntoView(jobId))
}

const handleRefresh = (): Promise<void> => refresh()

// === Keyboard Navigation ===
const handleKeydown = (event: KeyboardEvent): void => {
  // Ignore if user is typing in an input
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return
  }

  switch (event.key.toLowerCase()) {
    case 'r':
      if (!isLoading.value) {
        handleRefresh()
      }
      break
    case 'h':
      jobsMapRef.value?.toggleViewMode()
      break
    case 'escape':
      if (hasActiveFilters.value || searchQuery.value) {
        clearAllFilters()
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
    <header
      class="shrink-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-4 py-3 border-b border-(--color-divider)"
    >
      <AppHero compact />

      <div class="flex justify-center md:justify-end items-center gap-2">
        <p aria-live="polite" aria-atomic="true" class="text-xs text-(--color-text-3)">
          {{ jobsLastUpdatedText }}
        </p>
        <RefreshButton :is-loading="isLoading" @click="handleRefresh" />
      </div>
    </header>

    <main class="flex-1 min-h-0 relative flex flex-col md:flex-row">
      <!-- Desktop side panel -->
      <aside
        class="hidden md:flex md:flex-col md:w-[380px] lg:w-[420px] shrink-0 border-r border-(--color-divider) bg-(--color-bg)"
      >
        <JobPanel
          v-bind="jobPanelProps"
          @filter:click="toggleFilter"
          @clear-filters="clearAllFilters"
          @update:search-query="searchQuery = $event"
          @update:show-all-on-map="showAllOnMap = $event"
          @job:select="handleJobSelect"
          @job:hover="handleJobHover"
        />
      </aside>

      <!-- Map fills the remaining space on every device -->
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
              @clear-filters="clearAllFilters"
              @update:search-query="searchQuery = $event"
              @update:show-all-on-map="showAllOnMap = $event"
              @job:select="handleJobSelect"
              @job:hover="handleJobHover"
            />
          </template>
        </BottomSheet>
      </div>
    </main>
  </div>
</template>
