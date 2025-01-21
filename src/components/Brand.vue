<script lang="ts" setup>
const sourceUrl =
  'https://docs.google.com/spreadsheets/d/1s8XLKx-D23jEBM-LifstRFWX2Zj6Lv98twNxObHeXjQ/edit?gid=0#gid=0'
</script>

<template>
  <div class="text-center">
    <h1 class="title static block font-sans font-bold leading-snug antialiased mb-2">
      Pirate Thief
    </h1>

    <h2 class="subtitle">
      A simple job listing app to showcase the public Jobs list by
      <a :href="sourceUrl" target="_blank" rel="noopener noreferrer" class="font-weight-800">
        <span class="jobs-source-url">Startup Pirate</span>
      </a>
    </h2>
  </div>
</template>

<style lang="css" scoped>
.title {
  color: var(--color-text-1);
  font-family: 'Roboto';
  font-size: 2.5rem;
}

.subtitle {
  font-size: 1.15rem;
}

@media only screen and (min-width: 700px) {
  .title {
    font-size: 3.15rem;
  }

  .subtitle {
    font-size: 1.25rem;
  }
}

.jobs-source-url {
  color: var(--vt-c-red-light);
}
</style>
