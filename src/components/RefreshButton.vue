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
    class="inline-flex items-center py-2.5 px-5 text-sm font-medium text-gray-500 border border-gray-200 focus:z-10 focus:ring-2 focus:ring-white-700 focus:text-white-700"
    @click="refreshData"
  >
    <img
      v-if="!isTemporaryNotAvailable"
      src="./icons/refresh.svg"
      alt=""
      class="mr-2 text-white w-5 h-5"
    />
    <BaseSpinner v-if="isTemporaryNotAvailable" class="mr-2 w-5 h-5" />

    <span v-if="!isTemporaryNotAvailable">Refresh</span>
    <span v-else> Loading... </span>
  </button>
</template>

<style lang="css" scoped></style>
