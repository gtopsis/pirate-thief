<script lang="ts" setup>
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
</script>

<template>
  <ul class="w-full grid grid-cols-1">
    <li
      v-for="job in props.jobs"
      :key="getJobId(job)"
      :data-job-id="getJobId(job)"
      class="mb-4 last:mb-0"
    >
      <JobListItem
        :title="job[1]"
        :url="job[4]"
        :job-area="job[3]"
        :location="job[2]"
        :company="job[0]"
        :highlighted="getJobId(job) === props.highlightedJobId"
        @select="emit('job:select', getJobId(job))"
        @mouseenter="emit('job:hover', getJobId(job))"
        @mouseleave="emit('job:hover', null)"
      />
    </li>
  </ul>
</template>
