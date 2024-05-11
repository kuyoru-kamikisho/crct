<template>
  <v-app>
    <k-background></k-background>
    <keymap-controller></keymap-controller>
  </v-app>
</template>
<script setup lang="ts">
import KeymapController from './KeymapController.vue';
import useWebContext from '../store/useWebContext';
import {onMounted} from 'vue';
import KBackground from "./KBackground.vue";

onMounted(() => {
  window.mainApi.handleDeps().then(deps => {
    useWebContext().setDeps(deps);
  })
});
</script>
<style scoped></style>