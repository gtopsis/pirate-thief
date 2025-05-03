<script setup lang="ts">
export type IconSize = 'sm' | 'md' | 'lg'

interface Props {
  size?: IconSize
  color?: string
}
withDefaults(defineProps<Props>(), { size: 'md', color: 'currentColor' })

const sizeInPixels = {
  sm: 16,
  md: 20,
  lg: 24
}
</script>

<template>
  <slot :sizeInPixels="sizeInPixels[size]" :color="color" />
</template>

<style lang="css" scoped></style>
