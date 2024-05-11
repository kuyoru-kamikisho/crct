<template>
  <div class="k-background">
  </div>
</template>

<script setup lang="ts">
import {storeToRefs} from "pinia";
import useWebContext from "../store/useWebContext";
import {computed} from "vue";

const {getOpacity} = storeToRefs(useWebContext())
const opacity = computed(() => getOpacity.value / 100)
</script>

<style scoped lang="scss">
.k-background {
  width: 100%;
  height: 100%;
  position: absolute;
  background-color: rgba(60,63,65);
  opacity: v-bind(opacity);
  z-index: -8;
}
</style>