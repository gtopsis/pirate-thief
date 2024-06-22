<script lang="ts" setup>
import { computed } from 'vue'
import BaseSpinner from './BaseSpinner.vue'

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
    type="button"
    class="inline-flex items-center py-1.5 px-3 text-sm font-medium border focus:z-10 focus:ring-2 focus:ring-white-700 focus:text-white-700"
    @click="refreshData"
  >
    <BaseSpinner v-if="isTemporaryNotAvailable" class="mr-2 w-5 h-5" />

    <span v-if="!isTemporaryNotAvailable">Refresh</span>
    <span v-else> Loading... </span>
  </button>
</template>

<style lang="css" scoped></style>
