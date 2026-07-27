<script setup lang="ts">
import { ref } from 'vue'
import type { Job } from '@/types/types'
import { getJobId } from '@/utils/geo'

const props = defineProps<{
  jobs: readonly Job[]
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
      {{ props.jobs.length }} job{{ props.jobs.length === 1 ? '' : 's' }} couldn't be placed on the
      map
    </button>

    <ul v-if="isExpanded" class="mt-1 pl-4 list-disc space-y-0.5">
      <li v-for="job in props.jobs" :key="getJobId(job)">
        <strong>{{ job[0] }}</strong> - {{ job[1] }}: "{{ job[2] }}"
      </li>
    </ul>
  </div>
</template>
