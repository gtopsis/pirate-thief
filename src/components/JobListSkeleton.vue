<script lang="ts" setup>
withDefaults(defineProps<{ count?: number }>(), { count: 6 })
</script>

<template>
  <ul class="w-full grid grid-cols-1 max-w-2xl" aria-label="Loading jobs...">
    <li v-for="i in count" :key="i" class="mb-4 last:mb-0">
      <div class="flex flex-col justify-between py-2 px-3 shadow-md rounded min-h-20 w-full bg-(--color-bg-mute) animate-pulse">
        <!-- Title skeleton -->
        <div class="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-3"></div>

        <!-- Footer skeleton -->
        <div class="flex flex-col md:flex-row w-full md:justify-between gap-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        </div>
      </div>
    </li>
  </ul>
</template>
