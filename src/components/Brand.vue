<script lang="ts" setup>
const sourceUrl =
  'https://docs.google.com/spreadsheets/d/1s8XLKx-D23jEBM-LifstRFWX2Zj6Lv98twNxObHeXjQ/edit?gid=0#gid=0'
</script>

<template>
  <div class="text-center">
    <h5
      class="brand static block font-sans font-bold leading-snug tracking- antialiased text-5xl md:text-7xl mb-2"
    >
      Pirate Thief
    </h5>

    <h6 class="text-lg md:text-xl">
      A simple job listing app to showcase the public Jobs list by
      <a :href="sourceUrl" target="_blank" rel="noopener noreferrer" class="font-weight-800">
        <span class="jobs-source-url">Startup Pirate</span>
      </a>
    </h6>
  </div>
</template>

<style lang="css" scoped>
.brand {
  color: var(--color-text-1);
  font-family: 'Roboto';
}

.jobs-source-url {
  color: var(--vt-c-red-light);
}
</style>
