<script lang="ts" setup>
import { jobsListUrl, jobsSourceName } from '@/config'

const APP_NAME = 'Greek Tech Jobs Map'
const APP_DESCRIPTION = 'A simple job listing app to showcase the public Jobs list by'

withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
</script>

<template>
  <div class="text-center" :class="{ 'md:text-left': compact }">
    <h1
      class="font-sans font-bold leading-snug antialiased text-(--color-text-1)"
      :class="compact ? 'text-base md:text-xl mb-0' : 'text-2xl md:text-4xl mb-2'"
    >
      {{ APP_NAME }}
    </h1>

    <h2 v-if="!compact" class="text-sm md:text-md">
      {{ APP_DESCRIPTION }}
      <a
        :href="jobsListUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="font-extrabold text-(--vt-c-red-dark) underline decoration-(--vt-c-red-dark) dark:text-(--vt-c-red-light) dark:decoration-(--vt-c-red-light)"
      >
        {{ jobsSourceName }}
        <span class="sr-only">(opens in new tab)</span>
      </a>
    </h2>
    <p v-else class="sr-only">{{ APP_DESCRIPTION }} {{ jobsSourceName }}</p>
  </div>
</template>
