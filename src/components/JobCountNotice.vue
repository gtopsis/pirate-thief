<script setup lang="ts">
import type { Job } from '@/types/types'
import { pluralize } from '@/utils/text'

const props = defineProps<{
  jobs: readonly Job[]
  /**
   * Builds the full notice sentence from the job count and the already-
   * pluralized "job"/"jobs" noun (e.g. `(count, jobWord) => \`${count}
   * ${jobWord} couldn't be placed on the map\``) -- callers only supply
   * the surrounding wording that's specific to their notice; this
   * component owns pluralization and the show/hide-when-empty behavior
   * shared by every notice of this shape.
   */
  message: (count: number, jobWord: string) => string
}>()
</script>

<template>
  <p v-if="props.jobs.length > 0" class="text-xs text-(--color-text-3)">
    {{ props.message(props.jobs.length, pluralize(props.jobs.length, 'job')) }}
  </p>
</template>
