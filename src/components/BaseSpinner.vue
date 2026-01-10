<script lang="ts" setup>
import SpinnerIcon, { type IconSize } from '@/components/icons/SpinnerIcon.vue'

withDefaults(defineProps<{ size?: IconSize }>(), { size: 'lg' })
</script>

<template>
  <div role="status" aria-label="Loading">
    <SpinnerIcon :size="size" />
    <span class="sr-only">Loading...</span>
  </div>
</template>
