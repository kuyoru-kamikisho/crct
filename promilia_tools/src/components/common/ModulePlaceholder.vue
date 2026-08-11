<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="placeholder-panel">
    <div class="glow" aria-hidden="true" />
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.placeholder-panel {
  position: relative;
  overflow: hidden;
  padding: 36px 28px;
  border-radius: $radius-lg;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  text-align: center;
}

.glow {
  position: absolute;
  inset: -40% auto auto 30%;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(62, 207, 207, 0.18), transparent 70%);
  pointer-events: none;
}

h2 {
  margin: 0 0 10px;
  font-size: 20px;
  position: relative;
}

p {
  margin: 0;
  color: var(--c-text-muted);
  position: relative;
}
</style>
