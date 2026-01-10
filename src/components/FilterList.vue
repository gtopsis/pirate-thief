<script lang="ts" setup>
import FilterListItem from './FilterListItem.vue'

const props = defineProps<{
  filters: Map<string, boolean>
}>()

const emit = defineEmits<{
  (e: 'filter:click', name: string): void
}>()
</script>

<template>
  <ul class="w-full h-full flex gap-2 flex-wrap justify-center">
    <li v-for="[name, isEnabled] in filters" :key="name">
      <FilterListItem :name="name" :active="isEnabled" @click="emit('filter:click', name)" />
    </li>
  </ul>
</template>
