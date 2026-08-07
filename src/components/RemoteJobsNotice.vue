<script setup lang="ts">
import type { Job } from '@/types/types'
import CollapsibleJobsNotice from '@/components/CollapsibleJobsNotice.vue'
import { pluralize } from '@/utils/text'

const props = defineProps<{
  jobs: readonly Job[]
}>()
</script>

<template>
  <CollapsibleJobsNotice :jobs="props.jobs">
    <template #message="{ count }">
      {{ count }} remote {{ pluralize(count, 'job') }} shown as a nationwide overlay on the map
    </template>
    <template #item="{ job }">
      <strong>{{ job.company }}</strong> - {{ job.title }}
    </template>
  </CollapsibleJobsNotice>
</template>
