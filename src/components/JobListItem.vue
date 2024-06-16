<script setup lang="ts">
const props = defineProps<{
  title: string
  url: string
  jobArea: string
  location: string
  company: string
}>()

const visitJobPage = () => {
  window.open(props.url, '_blank')
}
</script>

<template>
  <div
    class="job flex items-center justify-between py-2 px-4 bg-gray-100 shadow-sm rounded"
    @click="visitJobPage"
  >
    <div class="flex items-center gap-x-3">
      <div>
        <h4 class="text-base font-bold leading-relaxed tracking-normal antialiased">
          <a
            class="text-gray-600 font-bold"
            :href="url"
            target="_blank"
            rel="noopener noreferrer"
            >{{ title }}</a
          >
        </h4>

        <p class="text-gray-600 mb-4">
          at <b>{{ company }}</b> - {{ location }}
        </p>

        <div class="grid grid-flow-col auto-cols-max md:auto-cols gap-2 pr-2">
          <span
            class="inline-flex items-center rounded-md bg-gray-200 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
            >{{ jobArea }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.job:hover {
  cursor: pointer;
}
</style>
