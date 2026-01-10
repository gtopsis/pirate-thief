<script lang="ts" setup>
import FilterListItem from './FilterListItem.vue'

defineProps<{
  filters: Map<string, boolean>
  jobCounts: Map<string, number>
}>()

const emit = defineEmits<{
  (e: 'filter:click', name: string): void
}>()
</script>

<template>
  <div class="w-full overflow-x-auto md:overflow-visible pb-2 md:pb-0">
    <ul
      role="group"
      aria-label="Filter jobs by tech area"
      class="flex gap-2 w-max md:w-full md:flex-wrap md:justify-center"
    >
      <li v-for="[name, isEnabled] in filters" :key="name">
        <FilterListItem
          :name="name"
          :active="isEnabled"
          :count="jobCounts.get(name) ?? 0"
          @click="emit('filter:click', name)"
        />
      </li>
    </ul>
  </div>
</template>
