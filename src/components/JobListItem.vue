<script setup lang="ts">
defineProps<{
  title: string
  url: string
  jobArea: string
  location: string
  company: string
}>()
</script>

<template>
  <div class="flex items-center justify-between py-2 px-4 mb-4 bg-gray-100 shadow-sm rounded">
    <div class="flex items-center gap-x-3">
      <div>
        <h6
          class="block font-sans text-base font-semibold leading-relaxed tracking-normal text-gray-600 antialiased"
        >
          {{ title }}
        </h6>
        <p class="block font-sans text-sm font-light leading-normal text-gray-700 antialiased mb-2">
          {{ company }}
        </p>

        <div class="grid grid-flow-col auto-cols-max md:auto-cols gap-2 pr-2">
          <span
            class="inline-flex items-center rounded-md bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
            >{{ jobArea }}</span
          >
          <span
            class="inline-flex items-center rounded-md bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
            >{{ location }}</span
          >
        </div>
      </div>
    </div>
    <h6
      class="block font-sans text-base font-semibold leading-relaxed tracking-normal text-blue-900 antialiased"
    >
      <a :href="url" target="_blank" rel="noopener noreferrer">Read job ad</a>
    </h6>
  </div>
</template>
