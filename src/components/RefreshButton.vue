<script lang="ts" setup>
import { computed } from 'vue'
import RefreshIcon from '@/components/icons/RefreshIcon.vue'

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const isTemporaryNotAvailable = computed(() => props.isLoading)

const refreshData = () => {
  emit('click')
}
</script>

<template>
  <button
    :disabled="isTemporaryNotAvailable"
    class="inline-flex items-center py-1.5 px-3 text-sm font-medium border-none"
    :title="isTemporaryNotAvailable ? 'Loading...' : 'Refetch Jobs'"
    @click="refreshData"
  >
    <RefreshIcon size="sm" />
  </button>
</template>

<style lang="css" scoped>
#refreshIcon {
  fill: var(--vt-c-blue-dark);
}

@media (prefers-color-scheme: dark) {
  #refreshIcon {
    fill: var(--vt-c-blue-light);
  }
}
</style>
