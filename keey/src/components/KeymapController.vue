<template>
  <div class="d-flex flex-column">
    <div class="group-select cursor-default d-flex px-3 py-1">
      <v-icon class="window-drager" icon="mdi-gamepad-outline"></v-icon>
      <div class="px-3" v-ripple>
        <span class="group-name">{{ getEnabledGroup?.group }}</span>
        <v-icon icon="mdi-menu-down"></v-icon>
      </div>
      <span>透明度：</span>
      <k-range-slider v-model="getOpacity"></k-range-slider>
      <v-spacer></v-spacer>
      <v-icon icon="mdi-tune-vertical"></v-icon>
      <v-icon icon="mdi-window-minimize"></v-icon>
      <v-icon icon="mdi-window-close"></v-icon>
    </div>
    <v-divider></v-divider>
    <ul v-if="getEnabledGroup" class="keys-container d-flex flex-wrap px-3 py-1">
      <li v-ripple class="key-btn py-1 px-2" v-for="k in getEnabledGroup.keymaps" :key="k.name">
        <span>{{ k.name }}</span>
      </li>
      <li v-ripple class="key-btn py-1 px-2">
        <v-icon icon="mdi-shape-square-plus"></v-icon>
      </li>
    </ul>
  </div>
</template>
<script setup lang="ts">
import {storeToRefs} from 'pinia';
import useWebContext from '../store/useWebContext';
import KRangeSlider from "./KRangeSlider.vue";

const {getEnabledGroup, getOpacity} = storeToRefs(useWebContext())
</script>
<style scoped lang="scss">
.key-btn {
  box-shadow: inset 0 0 1px 1px rgba(246, 245, 245, 0.4);
  transition: box-shadow .2s ease, background-color .2s ease, color .2s ease;

  &:hover {
    color: #bcfa70;
    box-shadow: inset 0 0 1px 1px rgba(248, 249, 250, 0.7);
    background-color: rgba(43, 43, 43, 0.95);
  }
}

.key-btn:not(:last-child) {
  margin-right: 4px;
}
</style>