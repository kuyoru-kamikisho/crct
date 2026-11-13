<template>
  <div class="mark-orbs">
    <span v-if="!orbs.length" class="mark-orbs__empty">无</span>
    <span
      v-for="orb in orbs"
      :key="orb.id"
      class="mark-orb"
      :class="`el-${orb.key}`"
      :title="`${orb.name}印记`"
      :style="orbStyle(orb.key)"
    />
  </div>
</template>

<script setup>
import { ELEMENTS } from '@/class/elements.js'

defineProps({
  /** [{ id, key, name, index }] */
  orbs: {
    type: Array,
    default: () => [],
  },
})

function orbStyle(key) {
  const el = ELEMENTS[key]
  if (!el) return {}
  return {
    '--orb-core': el.orb.core,
    '--orb-glow': el.orb.glow,
    '--orb-highlight': el.orb.highlight,
  }
}
</script>

<style scoped lang="scss">
.mark-orbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 22px;
}

.mark-orbs__empty {
  opacity: 0.4;
  font-size: 0.85rem;
}

.mark-orb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  flex-shrink: 0;
  background:
    radial-gradient(circle at 32% 28%, var(--orb-highlight) 0%, transparent 42%),
    radial-gradient(circle at 50% 55%, var(--orb-glow) 0%, var(--orb-core) 70%, #1a1020 140%);
  box-shadow:
    0 0 2px var(--orb-glow),
    0 0 4px var(--orb-core),
    inset 0 -2px 4px rgba(0, 0, 0, 0.28);
  animation: orb-pulse 2.4s ease-in-out infinite;
}

@keyframes orb-pulse {
  0%,
  100% {
    filter: brightness(1);
    transform: scale(1);
  }
  50% {
    filter: brightness(1.12);
    transform: scale(1.04);
  }
}
</style>
