<script lang="ts" setup>
import { computed } from 'vue'
import type { Job } from '@/types/types'
import { getJobId } from '@/utils/geo'
import JobListItem from './JobListItem.vue'

const props = defineProps<{
  jobs: readonly Job[]
  highlightedJobId?: string | null
}>()

const emit = defineEmits<{
  (e: 'job:select', jobId: string): void
  (e: 'job:hover', jobId: string | null): void
}>()

// Resolves each job's id once per render instead of recomputing it inline
// for every binding below (key, data-job-id, highlighted check, handlers).
const jobsWithIds = computed(() => props.jobs.map((job) => ({ job, id: getJobId(job) })))
</script>

<template>
  <ul class="w-full grid grid-cols-1">
    <li v-for="{ job, id } in jobsWithIds" :key="id" :data-job-id="id" class="mb-4 last:mb-0">
      <JobListItem
        :title="job.title"
        :url="job.url"
        :job-area="job.techArea"
        :location="job.location"
        :company="job.company"
        :highlighted="id === props.highlightedJobId"
        @select="emit('job:select', id)"
        @mouseenter="emit('job:hover', id)"
        @mouseleave="emit('job:hover', null)"
      />
    </li>
  </ul>
</template>
