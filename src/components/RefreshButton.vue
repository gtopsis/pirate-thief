<script lang="ts" setup>
import { computed } from 'vue'
import RefreshIcon from '@/components/icons/RefreshIcon.vue'

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const buttonLabel = computed(() => (props.isLoading ? 'Loading jobs...' : 'Refresh jobs'))
</script>

<template>
  <button
    type="button"
    :disabled="isLoading"
    :aria-label="buttonLabel"
    :title="buttonLabel"
    class="inline-flex items-center py-1.5 px-3 text-sm font-medium border-none cursor-pointer disabled:cursor-wait text-(--vt-c-blue-dark) dark:text-(--vt-c-blue-light)"
    @click="emit('click')"
  >
    <RefreshIcon :class="{ 'animate-spin': isLoading }" size="sm" color="currentColor" />
  </button>
</template>
