<template>
  <div class="k-range-slider d-flex">
    <fieldset>
      <label>{{ model }}</label>
    </fieldset>
  </div>
</template>

<script setup lang="ts">
const model = defineModel({default: 60})
</script>

<style scoped lang="scss">

</style>