<script lang="ts" setup>
import RefreshIcon from '@/components/icons/RefreshIcon.vue'

defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <button
    type="button"
    :disabled="isLoading"
    class="inline-flex items-center py-1.5 px-3 text-sm font-medium border-none cursor-pointer disabled:cursor-wait text-(--vt-c-blue-dark) dark:text-(--vt-c-blue-light)"
    :title="isLoading ? 'Loading...' : 'Refetch Jobs'"
    @click="emit('click')"
  >
    <RefreshIcon :class="{ 'animate-spin': isLoading }" size="sm" color="currentColor" />
  </button>
</template>
