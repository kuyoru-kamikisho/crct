<template>
  <div>
    <div>
        <button @click="pugong.execute" class="pugong">
          普攻
          <div v-if="pugong.cooldown" class="cooldown">
            <span>{{ pugong.cooldown }}</span>
          </div>
        </button>
        <button @click="ejineng.execute" class="ejineng">
          星鸣技
          <div v-if="ejineng.cooldown" class="cooldown">
            <span>{{ ejineng.cooldown }}</span>
          </div>
        </button>
        <button @click="rjineng.execute" class="rjineng">
          星绝技
          <div v-if="rjineng.cooldown" class="cooldown">
            <span>{{ rjineng.cooldown }}</span>
          </div>
        </button>
    </div>
  </div>
</template>

<script setup>
import moyin from '@/class/moyin';
import { ref } from 'vue';

const c_moyin = ref(moyin());
const { pugong, ejineng, rjineng } = c_moyin.value;
</script>

<style scoped lang="scss">

</style>
