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
        <h2 class="text-xl text-gray-600 font-bold leading-relaxed tracking-normal antialiased">
          {{ title }}
        </h2>

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
