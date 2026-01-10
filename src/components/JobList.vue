<script lang="ts" setup>
import type { Job } from '@/types/types'
import JobListItem from './JobListItem.vue'

defineProps<{
  jobs: readonly Job[]
}>()
</script>

<template>
  <ul class="w-full grid grid-cols-1 max-w-2xl">
    <li
      v-for="([company, title, location, techArea, url], index) in jobs"
      :key="index"
      class="mb-4 last:mb-0"
    >
      <JobListItem
        :title="title"
        :url="url"
        :job-area="techArea"
        :location="location"
        :company="company"
      />
    </li>
  </ul>
</template>
