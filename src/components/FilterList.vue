<script lang="ts" setup>
import FilterListItem from './FilterListItem.vue'
import { computed } from 'vue'

const props = defineProps<{
  filters: Map<string, boolean>
}>()

const emit = defineEmits<{
  (e: 'filter:click', name: string): void
}>()

const filtersEntries = computed(() => props.filters.entries())
</script>

<template>
  <ul class="w-full flex justify-center flex-wrap">
    <li v-for="[name, isEnabled] in filtersEntries" :key="name" class="mx-1 last:ml-0">
      <FilterListItem :name="name" :active="isEnabled" @click="emit('filter:click', name)" />
    </li>
  </ul>
</template>

<style lang="css" scoped></style>
