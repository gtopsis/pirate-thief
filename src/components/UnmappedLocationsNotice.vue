<script setup lang="ts">
import type { Job } from '@/types/types'
import { pluralize } from '@/utils/text'

const props = defineProps<{
  jobs: readonly Job[]
}>()
</script>

<template>
  <p v-if="props.jobs.length > 0" class="text-xs text-(--color-text-3)">
    {{ props.jobs.length }} {{ pluralize(props.jobs.length, 'job') }} couldn't be placed on the map
  </p>
</template>
