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
    class="job flex flex-col justify-between py-2 px-4 shadow-md hover:cursor-pointer rounded"
    @click="visitJobPage"
  >
    <header>
      <a class="job__title text-xl font-bold leading-relaxed tracking-normal antialiased">
        {{ title }}
      </a>
    </header>

    <footer class="flex flex-col md:flex-row w-full md:justify-between gap-2">
      <p class="job__details">
        at <b>{{ company }}</b> - {{ location }}
      </p>

      <div>
        <span
          class="job__area inline-flex items-center rounded-md bg-gray-200 px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10"
          >{{ jobArea }}</span
        >
      </div>
    </footer>
  </div>
</template>

<style scoped>
.job {
  background-color: var(--color-bg-mute);
  min-height: 75px;
}

.job__title {
  color: var(--vt-c-blue-dark);
}

.job__area {
  color: var(--vt-c-text-light-1);
}

@media (prefers-color-scheme: dark) {
  .job__title {
    color: var(--vt-c-blue-light);
  }
}
</style>
