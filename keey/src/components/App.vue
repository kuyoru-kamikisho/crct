<template>
    <v-app>
        <keymap-controller></keymap-controller>
    </v-app>
</template>
<script setup lang="ts">
import KeymapController from './KeymapController.vue';
import useWebContext from '../store/useWebContext';
import { onMounted } from 'vue';

onMounted(() => {
    window.mainApi.handleDeps().then(deps => {
        useWebContext().setDeps(deps);
    })
});
</script>
<style scoped></style>