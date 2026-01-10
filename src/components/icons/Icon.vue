<script setup lang="ts">
export type IconSize = 'sm' | 'md' | 'lg'

const SIZE_MAP: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
}

interface Props {
  size?: IconSize
  color?: string
}
const props = withDefaults(defineProps<Props>(), { size: 'md', color: 'currentColor' })
</script>

<template>
  <slot :sizeInPixels="SIZE_MAP[props.size]" :color="props.color" />
</template>
