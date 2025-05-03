<script lang="ts" setup>
import { jobsListSourceUrl } from '@/utils'
</script>

<template>
  <div class="text-center">
    <h1
      class="title static block font-sans font-bold leading-snug antialiased mb-2 text-3xl md:text-[3.5rem]"
    >
      Pirate Thief
    </h1>

    <h2 class="subtitle text-md md:text-2xl">
      A simple job listing app to showcase the public Jobs list by
      <a
        :href="jobsListSourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="jobs-source-url font-weight-800"
      >
        <span>Startup Pirate</span>
      </a>
    </h2>
  </div>
</template>

<style lang="css" scoped>
.title {
  color: var(--color-text-1);
  font-family: 'Roboto';
}

.jobs-source-url {
  color: var(--vt-c-red-dark);
  text-decoration-color: var(--vt-c-red-dark);
}

@media (prefers-color-scheme: dark) {
  .jobs-source-url {
    color: var(--vt-c-red-light);
    text-decoration-color: var(--vt-c-red-light);
  }
}
</style>
