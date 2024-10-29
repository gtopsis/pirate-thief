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
    class="job flex flex-col justify-between py-2 px-4 shadow-sm hover:cursor-pointer hover:drop-shadow-lg rounded"
    @click="visitJobPage"
  >
    <header>
      <h2 class="job__title text-xl font-bold leading-relaxed tracking-normal antialiased">
        {{ title }}
      </h2>

      <p class="job__details mb-4">
        at <b>{{ company }}</b> - {{ location }}
      </p>
    </header>

    <footer class="grid grid-flow-col auto-cols-max md:auto-cols gap-2 pr-2">
      <span
        class="job__area inline-flex items-center rounded-md bg-gray-200 px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10"
      >{{ jobArea }}</span>
    </footer>
  </div>
</template>

<style scoped>
.job {
  background-color: var(--color-background-mute);
  min-height: 125px;
}

.job__title {
  color: var(--vt-c-blue-light);
}

.job__area {
  color: var(--vt-c-text-light-1);
}
</style>
