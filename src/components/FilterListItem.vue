<script lang="ts" setup>
const props = defineProps<{
  name: string
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <button
    type="button"
    class="grid select-none items-center whitespace-nowrap rounded-lg py-1.5 px-3 text-xs font-bold uppercase shadow-xs ring-1 ring-inset ring-gray-500/10 cursor-pointer transition-colors"
    :class="active ? 'bg-(--vt-c-blue-dark) text-white' : 'bg-(--vt-c-black-soft) text-white'"
    @click="emit('click')"
  >
    {{ name }}
  </button>
</template>
