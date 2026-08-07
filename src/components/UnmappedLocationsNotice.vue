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
      {{ count }} {{ pluralize(count, 'job') }} couldn't be placed on the map
    </template>
    <template #item="{ job }">
      <strong>{{ job.company }}</strong> - {{ job.title }}: "{{ job.location }}"
    </template>
  </CollapsibleJobsNotice>
</template>
