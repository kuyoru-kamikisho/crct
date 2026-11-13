<template>
  <div
    class="ring-progress"
    :class="{ full: isFull }"
    :style="boxStyle"
  >
    <svg
      class="ring-progress__svg"
      :viewBox="`0 0 ${size} ${size}`"
      aria-hidden="true"
    >
      <!-- 底轨 -->
      <circle
        class="ring-progress__track"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="trackColor"
        :stroke-width="strokeWidth"
      />
      <!-- 进度弧：顶部正中起，逆时针增长 -->
      <circle
        class="ring-progress__arc"
        :class="{ flash: isFull }"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="strokeWidth"
        stroke-linecap="butt"
        :stroke-dasharray="dasharray"
        :stroke-dashoffset="dashoffset"
        :transform="arcTransform"
      />
    </svg>

    <div class="ring-progress__slot" :class="{ thunder: isFull }">
      <slot />
      <!-- 满能量雷电特效层 -->
      <div v-if="isFull" class="thunder-fx" aria-hidden="true">
        <span class="thunder-fx__bolt b1" />
        <span class="thunder-fx__bolt b2" />
        <span class="thunder-fx__bolt b3" />
        <span class="thunder-fx__spark s1" />
        <span class="thunder-fx__spark s2" />
        <span class="thunder-fx__spark s3" />
        <span class="thunder-fx__spark s4" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 进度 0~100（或 0~1） */
  value: {
    type: [String, Number],
    default: 0,
  },
  size: {
    type: Number,
    default: 64,
  },
  strokeWidth: {
    type: Number,
    default: 3,
  },
  color: {
    type: String,
    default: '#5ec8ff',
  },
  trackColor: {
    type: String,
    default: 'rgba(255,255,255,0.08)',
  },
})

const size = computed(() => props.size)
const center = computed(() => props.size / 2)
const radius = computed(() => props.size / 2 - props.strokeWidth)

const progress = computed(() => {
  let n = Number(props.value)
  if (!Number.isFinite(n)) return 0
  if (n > 0 && n <= 1) n *= 100
  return Math.min(100, Math.max(0, n))
})

const isFull = computed(() => progress.value >= 99.5)

const circumference = computed(() => 2 * Math.PI * radius.value)

const dasharray = computed(() => {
  const C = circumference.value
  return `${C} ${C}`
})

/** offset 从满圈减到 0 = 进度增加；满时 offset=0 闭合 */
const dashoffset = computed(() => {
  const C = circumference.value
  return C * (1 - progress.value / 100)
})

/**
 * SVG 圆默认从 3 点顺时针画。
 * 先移到圆心 → 水平翻转（变逆时针）→ 再转 -90° 让起点到 12 点 → 移回。
 */
const arcTransform = computed(() => {
  const c = center.value
  return `translate(${c} ${c}) scale(-1 1) rotate(-90) translate(${-c} ${-c})`
})

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

const strokePad = computed(() => `${props.strokeWidth * 2 + 2}px`)
</script>

<style scoped lang="scss">
.ring-progress {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
}

.ring-progress__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.ring-progress__arc {
  transition: stroke-dashoffset 0.15s linear;

  &.flash {
    animation: ring-full-flash 1.1s ease-in-out infinite;
  }
}

@keyframes ring-full-flash {
  0%,
  100% {
    stroke: #5ec8ff;
    filter: brightness(1) drop-shadow(0 0 2px rgba(94, 200, 255, 0.4));
  }
  40% {
    stroke: #d4f3ff;
    filter: brightness(1.8) drop-shadow(0 0 8px rgba(160, 230, 255, 0.95));
  }
  70% {
    stroke: #8adcff;
    filter: brightness(1.25) drop-shadow(0 0 4px rgba(94, 200, 255, 0.7));
  }
}

.ring-progress__slot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - v-bind(strokePad));
  height: calc(100% - v-bind(strokePad));
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  overflow: hidden;
  box-sizing: border-box;

  :deep(> .skill-btn),
  :deep(> button) {
    width: 100% !important;
    height: 100% !important;
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    box-sizing: border-box;
  }

  &.thunder {
    :deep(> .skill-btn),
    :deep(> button) {
      animation: btn-thunder-glow 1.1s ease-in-out infinite;
    }
  }
}

@keyframes btn-thunder-glow {
  0%,
  100% {
    filter: brightness(1);
    box-shadow: 0 0 0 transparent;
  }
  35% {
    filter: brightness(1.35) saturate(1.2);
    box-shadow:
      0 0 10px rgba(140, 210, 255, 0.55),
      inset 0 0 12px rgba(180, 230, 255, 0.25);
  }
  55% {
    filter: brightness(1.1);
  }
}

.thunder-fx {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: 50%;
  overflow: hidden;
  z-index: 3;
}

.thunder-fx__bolt {
  position: absolute;
  width: 2px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    #e8f7ff 15%,
    #7ad4ff 50%,
    #e8f7ff 85%,
    transparent 100%
  );
  box-shadow: 0 0 6px #9fe8ff, 0 0 2px #fff;
  opacity: 0;
  border-radius: 1px;
  transform-origin: top center;

  &.b1 {
    left: 28%;
    top: 8%;
    height: 55%;
    transform: rotate(-18deg);
    animation: bolt-strike 1.4s ease-in-out infinite;
  }
  &.b2 {
    left: 52%;
    top: 5%;
    height: 62%;
    width: 1.5px;
    transform: rotate(12deg);
    animation: bolt-strike 1.4s ease-in-out 0.35s infinite;
  }
  &.b3 {
    left: 68%;
    top: 18%;
    height: 42%;
    transform: rotate(28deg);
    animation: bolt-strike 1.4s ease-in-out 0.7s infinite;
  }
}

@keyframes bolt-strike {
  0%,
  12%,
  100% {
    opacity: 0;
    clip-path: inset(0 0 100% 0);
  }
  16% {
    opacity: 1;
    clip-path: inset(0 0 40% 0);
  }
  22% {
    opacity: 0.95;
    clip-path: inset(0 0 0 0);
    filter: brightness(2);
  }
  30% {
    opacity: 0.35;
  }
  38% {
    opacity: 0;
  }
}

.thunder-fx__spark {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 6px #9fe8ff, 0 0 10px #5ec8ff;
  opacity: 0;

  &.s1 {
    top: 22%;
    left: 30%;
    animation: spark-pop 1.4s ease-out infinite;
  }
  &.s2 {
    top: 40%;
    left: 58%;
    animation: spark-pop 1.4s ease-out 0.35s infinite;
  }
  &.s3 {
    top: 58%;
    left: 42%;
    animation: spark-pop 1.4s ease-out 0.55s infinite;
  }
  &.s4 {
    top: 30%;
    left: 72%;
    animation: spark-pop 1.4s ease-out 0.75s infinite;
  }
}

@keyframes spark-pop {
  0%,
  100% {
    opacity: 0;
    transform: scale(0.4);
  }
  18% {
    opacity: 1;
    transform: scale(1.4);
  }
  35% {
    opacity: 0;
    transform: scale(0.6) translateY(6px);
  }
}
</style>
