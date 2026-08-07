<script setup lang="ts">
import type { Job } from '@/types/types'
import CollapsibleJobsNotice from '@/components/CollapsibleJobsNotice.vue'

const props = defineProps<{
  jobs: readonly Job[]
}>()
</script>

<template>
  <CollapsibleJobsNotice :jobs="props.jobs">
    <template #message="{ count }">
      {{ count }} remote job{{ count === 1 ? '' : 's' }} shown as a nationwide overlay on the map
    </template>
    <template #item="{ job }">
      <strong>{{ job[0] }}</strong> - {{ job[1] }}
    </template>
  </CollapsibleJobsNotice>
</template>
