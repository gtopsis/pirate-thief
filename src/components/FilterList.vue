<script lang="ts" setup>
import Filter from './Filter.vue'
import { computed } from 'vue'

const props = defineProps<{
  filters: Map<string, boolean>
}>()

const filtersEntries = computed(() => props.filters.entries())
</script>

<template>
  <ul class="w-full flex justify-center flex-wrap">
    <li v-for="[name, isEnabled] in filtersEntries" :key="name" class="mx-1 last:ml-0">
      <Filter :name="name" :active="isEnabled" />
    </li>
  </ul>
</template>

<style lang="css" scoped></style>
