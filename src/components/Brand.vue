<script lang="ts" setup>
import { jobsListUrl } from '@/utils'

const APP_NAME = 'Pirate Thief'
const APP_DESCRIPTION = 'A simple job listing app to showcase the public Jobs list by'
const SOURCE_NAME = 'Startup Pirate'
</script>

<template>
  <div class="text-center">
    <h1 class="font-sans font-bold leading-snug antialiased mb-2 text-3xl text-(--color-text-1) md:text-6xl">
      {{ APP_NAME }}
    </h1>

    <h2 class="text-md md:text-2xl">
      {{ APP_DESCRIPTION }}
      <a
        :href="jobsListUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="font-extrabold text-(--vt-c-red-dark) underline decoration-(--vt-c-red-dark) dark:text-(--vt-c-red-light) dark:decoration-(--vt-c-red-light)"
      >
        {{ SOURCE_NAME }}
      </a>
    </h2>
  </div>
</template>
