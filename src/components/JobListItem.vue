<script setup lang="ts">
defineProps<{
  title: string
  url: string
  jobArea: string
  location: string
  company: string
  highlighted?: boolean
}>()

const emit = defineEmits<{
  (e: 'select'): void
}>()
</script>

<!--
  The whole card is click-to-select (fly to this job on the map) for mouse
  users, but isn't itself made focusable/`role="button"`: this card already
  contains a real, independently focusable link (the job title), and
  nesting an interactive role around another interactive element is an
  ARIA anti-pattern screen readers handle poorly. Instead, tabbing to that
  link (its `@focus`) triggers the same `select` -- giving keyboard users
  full parity without the nested-interactive-content problem.
-->
<template>
  <article
    :data-highlighted="highlighted ? 'true' : undefined"
    class="flex flex-col justify-between py-2 px-3 shadow-md rounded min-h-20 w-full bg-(--color-bg-mute) transition-shadow cursor-pointer data-[highlighted]:ring-2 data-[highlighted]:ring-(--vt-c-blue-dark)"
    @click="emit('select')"
  >
    <a
      class="text-lg md:text-xl font-bold leading-relaxed tracking-normal antialiased text-(--vt-c-blue-dark) dark:text-(--vt-c-blue-light) rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--vt-c-blue-dark)"
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      @focus="emit('select')"
    >
      {{ title }}
      <span class="sr-only">(opens in new tab)</span>
    </a>

    <footer class="flex flex-col md:flex-row w-full md:justify-between gap-2">
      <p>
        at <strong>{{ company }}</strong> - {{ location }}
      </p>

      <span
        class="inline-flex items-center rounded-md bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-500/10"
      >
        {{ jobArea }}
      </span>
    </footer>
  </article>
</template>
