<script setup lang="ts">
import { ref } from 'vue'
import type { Job } from '@/types/types'
import { getJobId } from '@/utils/geo'

const props = defineProps<{
  jobs: readonly Job[]
}>()

defineSlots<{
  /** The button label, e.g. "N jobs couldn't be placed on the map". */
  message(props: { count: number }): unknown
  /** How to render each job once the notice is expanded. */
  item(props: { job: Job }): unknown
}>()

const isExpanded = ref(false)
</script>

<template>
  <div v-if="props.jobs.length > 0" class="text-xs text-(--color-text-3)">
    <button
      type="button"
      class="flex items-center gap-1 hover:text-(--color-text-2) cursor-pointer"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <span aria-hidden="true">{{ isExpanded ? '▾' : '▸' }}</span>
      <slot name="message" :count="props.jobs.length" />
    </button>

    <ul v-if="isExpanded" class="mt-1 pl-4 list-disc space-y-0.5">
      <li v-for="job in props.jobs" :key="getJobId(job)">
        <slot name="item" :job="job" />
      </li>
    </ul>
  </div>
</template>
