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
    <!-- <button
      data-dismissible-target="chip"
      class="!absolute top-2/4 right-1 mx-px h-5 max-h-[32px] w-5 max-w-[32px] -translate-y-2/4 select-none rounded-md text-center align-middle font-sans text-xs font-medium uppercase text-white transition-all hover:bg-white/10 active:bg-white/30 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
      type="button"
    >
      <span class="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          class="w-4 h-4"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </span>
    </button> -->
  </div>
</template>

<style lang="css" scoped>
.filter {
  cursor: pointer;
  background-color: var(--vt-c-black-soft);
}

.filter--active {
  background-color: var(--vt-c-blue-dark);
}

.filter__text {
  color: var(--color-text);
}
</style>
