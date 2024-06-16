<script lang="ts" setup>
import JobListItem from './JobListItem.vue'

defineProps<{
  jobs: any[]
}>()
</script>

<template>
  <ul class="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
    <li v-for="(job, index) in jobs" :key="index" class="mb-4 last:mb-0">
      <JobListItem
        :title="job[1]"
        :url="job[4]"
        :job-area="job[3]"
        :location="job[2]"
        :company="job[0]"
      />
    </li>
  </ul>
</template>

<style lang="css" scoped></style>
