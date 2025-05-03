<script lang="ts" setup>
defineProps<{
  name: string
  active: boolean
}>()

const emits = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <div
    class="filter relative grid select-none items-center whitespace-nowrap rounded-lg py-1.5 px-3 text-xs font-bold uppercase shadow-sm ring-1 ring-inset ring-gray-500/10 my-1"
    :class="{ 'filter--active': active }"
    data-dismissible="chip"
    @click="emits('click')"
  >
    <span class="filter__text font-bold">{{ name }}</span>
  </div>
</template>

<style lang="css" scoped>
.filter {
  cursor: pointer;
  background-color: var(--vt-c-black-soft);
}

.filter.filter--active {
  background-color: var(--vt-c-blue-dark);
}

.filter__text {
  color: var(--color-text-dark-2);
  /* TODO: enrich relative css vars regarding text color for dark & light themes */
  color: white;
}

.filter.filter--active .filter__text {
  color: var(--vt-c-text-dark-1);
}
</style>
