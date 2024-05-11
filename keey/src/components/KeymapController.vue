<template>
<div class="d-flex"></div>
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import useWebContext from '../store/useWebContext';

const { deps } = storeToRefs(useWebContext())
</script>
<style scoped lang="scss"></style>