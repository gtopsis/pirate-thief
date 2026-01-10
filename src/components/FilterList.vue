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
  <ul class="w-full h-full flex gap-2 flex-wrap justify-center">
    <li v-for="[name, isEnabled] in filters" :key="name">
      <FilterListItem
        :name="name"
        :active="isEnabled"
        :count="jobCounts.get(name) ?? 0"
        @click="emit('filter:click', name)"
      />
    </li>
  </ul>
</template>
