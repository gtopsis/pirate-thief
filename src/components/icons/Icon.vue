<script setup lang="ts">
export type IconSize = 'sm' | 'md' | 'lg'

interface Props {
  size?: IconSize
}
withDefaults(defineProps<Props>(), { size: 'md' })

const sizeInPixels = {
  sm: 16,
  md: 20,
  lg: 24
}
</script>

<template>
  <slot :sizeInPixels="sizeInPixels[size]"></slot>
</template>

<style lang="css" scoped></style>
