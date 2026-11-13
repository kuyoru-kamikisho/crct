<template>
  <div class="ring-counter" :class="{ empty: isEmpty }" :style="boxStyle">
    <svg
      class="ring-counter__svg"
      :viewBox="`0 0 ${size} ${size}`"
      aria-hidden="true"
    >
      <!-- 底轨：始终按 count 画满，保证外框是正圆 -->
      <circle
        v-for="(seg, i) in trackSegments"
        :key="`track-${i}`"
        class="ring-counter__arc track"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="emptyColor"
        :stroke-width="strokeWidth"
        stroke-linecap="butt"
        :stroke-dasharray="seg.dasharray"
        :transform="seg.transform"
      />
      <!-- 亮段：前 now 段；新点亮的段带闪烁 -->
      <circle
        v-for="(seg, i) in activeSegments"
        :key="`active-${seg.index}-${seg.flashKey}`"
        class="ring-counter__arc active"
        :class="{ flash: seg.flashing }"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="strokeWidth"
        stroke-linecap="butt"
        :stroke-dasharray="seg.dasharray"
        :transform="seg.transform"
      />
    </svg>
    <div class="ring-counter__slot">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  /** 最大充能 / 圆环总段数 */
  count: {
    type: [String, Number],
    required: true,
  },
  /** 当前剩余充能；0 全灰，1 左半环亮，以此类推 */
  now: {
    type: [String, Number],
    default: null,
  },
  size: {
    type: Number,
    default: 100,
  },
  strokeWidth: {
    type: Number,
    default: 6,
  },
  gap: {
    type: Number,
    default: 14,
  },
  color: {
    type: String,
    default: '#5ec8ff',
  },
  emptyColor: {
    type: String,
    default: '#3a3f48',
  },
})

const size = computed(() => props.size)
const center = computed(() => props.size / 2)
const radius = computed(() => props.size / 2 - props.strokeWidth)

const segmentCount = computed(() => {
  const n = Math.floor(Number(props.count))
  return Number.isFinite(n) && n > 0 ? n : 0
})

const current = computed(() => {
  if (props.now === null || props.now === undefined || props.now === '') {
    return segmentCount.value
  }
  const n = Math.floor(Number(props.now))
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, segmentCount.value)
})

const isEmpty = computed(() => current.value <= 0)

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

/** 内槽给描边留空，子元素保持正方形 */
const strokePad = computed(() => `${props.strokeWidth * 2 + 2}px`)

/** 正在闪烁的段 index → 用于强制重播动画的 key */
const flashMap = ref({})
let flashSeq = 0
let prevNow = current.value

watch(current, (n) => {
  const prev = prevNow
  prevNow = n
  if (n <= prev) return
  const next = { ...flashMap.value }
  for (let i = prev; i < n; i++) {
    flashSeq += 1
    next[i] = flashSeq
  }
  flashMap.value = next
  window.setTimeout(() => {
    const cleared = { ...flashMap.value }
    for (let i = prev; i < n; i++) {
      if (cleared[i] === next[i]) delete cleared[i]
    }
    flashMap.value = cleared
  }, 700)
})

/**
 * 段几何：第 0 段为左半环（从下间隙顺时针经 9 点到上）。
 * SVG 圆 stroke 默认从 3 点顺时针；rotate(90°) 后从 6 点开始。
 */
function buildLayout() {
  const n = segmentCount.value
  if (n <= 0) return []

  const r = radius.value
  const C = 2 * Math.PI * r
  const gapDeg = Math.min(props.gap, 360 / n / 2)
  const gapLen = (C * gapDeg) / 360
  const segLen = (C - n * gapLen) / n
  const step = 360 / n
  // 从正下方间隙之后开始 → 第 0 段走左半环
  const startRot = 90 + gapDeg / 2
  const cx = center.value
  const cy = center.value

  return Array.from({ length: n }, (_, i) => ({
    index: i,
    dasharray: `${segLen} ${C}`,
    transform: `rotate(${startRot + step * i} ${cx} ${cy})`,
  }))
}

const trackSegments = computed(() => buildLayout())

const activeSegments = computed(() => {
  const cur = current.value
  if (cur <= 0) return []
  const flashes = flashMap.value
  return buildLayout()
    .slice(0, cur)
    .map((seg) => ({
      ...seg,
      flashing: flashes[seg.index] != null,
      flashKey: flashes[seg.index] ?? 0,
    }))
})
</script>

<style scoped lang="scss">
.ring-counter {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  box-sizing: border-box;
}

.ring-counter__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.ring-counter__arc {
  transition: stroke 0.2s ease, opacity 0.2s ease;

  &.flash {
    animation: ring-flash 0.65s ease-out;
  }
}

@keyframes ring-flash {
  0% {
    opacity: 0;
    filter: brightness(2.4) drop-shadow(0 0 4px #9fe8ff);
  }
  35% {
    opacity: 1;
    filter: brightness(1.8) drop-shadow(0 0 6px #5ec8ff);
  }
  55% {
    filter: brightness(1.15);
  }
  70% {
    filter: brightness(1.7) drop-shadow(0 0 5px #8adcff);
  }
  100% {
    opacity: 1;
    filter: brightness(1) drop-shadow(0 0 0 transparent);
  }
}

.ring-counter__slot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(100% - v-bind(strokePad));
  height: calc(100% - v-bind(strokePad));
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  overflow: visible;
  box-sizing: border-box;

  :deep(> *) {
    width: 100% !important;
    height: 100% !important;
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    box-sizing: border-box;
  }
}
</style>
