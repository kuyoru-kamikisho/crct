<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as echarts from 'echarts/core'
import { RadarChart } from 'echarts/charts'
import { RadarComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useSettingsStore } from '@/stores/settings'
import { VOTE_CATEGORIES } from '@/constants/vote'
import { replaceRp } from '@/utils/replaceRp'
import { readThemeColors } from '@/utils/chartTheme'

echarts.use([RadarChart, RadarComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  item: { type: Object, required: true },
  maxScore: { type: Number, default: 1 },
})

const { t, locale } = useI18n()
const settings = useSettingsStore()
const chartRef = ref(null)
let chart = null
let resizeObs = null

function indicators() {
  const max = Math.max(1, Number(props.maxScore) || 1)
  return VOTE_CATEGORIES.map((key) => ({
    name: t(`rank.radarShort.${key}`),
    key,
    max,
  }))
}

function radarMetrics() {
  const size = Math.min(
    chart?.getWidth() || chartRef.value?.clientWidth || 118,
    chart?.getHeight() || chartRef.value?.clientHeight || 118,
  )
  const compact = size < 112
  const nameReserve = compact ? 26 : 30
  return {
    center: ['50%', '50%'],
    radius: Math.max(16, size / 2 - nameReserve),
    axisNameGap: compact ? 3 : 4,
    fontSize: compact ? 8 : 9,
  }
}

function renderChart() {
  if (!chart) return
  chart.resize()
  const colors = readThemeColors()
  const axes = indicators()
  const values = axes.map((axis) => Number(props.item.scores?.[axis.key]) || 0)
  const layout = radarMetrics()
  chart.setOption(
    {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 520,
      tooltip: {
        trigger: 'item',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.text, fontSize: 11 },
      },
      radar: {
        indicator: axes.map(({ name, max }) => ({ name, max })),
        center: layout.center,
        radius: layout.radius,
        startAngle: 90,
        splitNumber: 3,
        axisNameGap: layout.axisNameGap,
        axisName: {
          color: colors.muted,
          fontSize: layout.fontSize,
          lineHeight: layout.fontSize + 2,
          padding: 0,
          overflow: 'none',
          formatter(value) {
            return value
          },
        },
        axisLine: { lineStyle: { color: colors.border } },
        splitLine: { lineStyle: { color: colors.border } },
        splitArea: {
          areaStyle: {
            color: ['rgba(62, 207, 207, 0.04)', 'rgba(62, 207, 207, 0.01)'],
          },
        },
      },
      series: [
        {
          type: 'radar',
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { width: 1.8, color: colors.accent },
          itemStyle: { color: colors.star },
          areaStyle: { color: colors.accent, opacity: 0.28 },
          data: [{ value: values, name: props.item.nameZh || props.item.name }],
        },
      ],
    },
    { notMerge: true },
  )
}

onMounted(async () => {
  await nextTick()
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  renderChart()
  resizeObs = new ResizeObserver(() => renderChart())
  resizeObs.observe(chartRef.value)
})

onUnmounted(() => {
  resizeObs?.disconnect()
  resizeObs = null
  chart?.dispose()
  chart = null
})

watch(
  () => [props.item, props.maxScore, locale.value, settings.theme],
  () => renderChart(),
  { deep: true },
)
</script>

<template>
  <article class="card" :class="item.place ? `place-${item.place}` : ''">
    <div class="avatar-wrap">
      <div class="avatar">
        <span class="fallback">{{ (item.nameZh || item.name || '?').slice(0, 1) }}</span>
        <img v-if="item.icon" :src="item.icon" :alt="item.name" width="48" height="48" loading="lazy" decoding="async"
          @error="$event.target.style.display = 'none'" />
      </div>
      <span v-if="item.place && item.place <= 3" class="crown" :class="`crown-${item.place}`" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M3.4 9.2 7.1 13l4.9-7.6 4.9 7.6 3.7-3.8V18H3.4V9.2Z" fill="currentColor" />
        </svg>
      </span>
    </div>
    <div class="meta">
      <h3>{{ item.nameZh }}</h3>
      <p class="en">{{ item.nameEn }}</p>
      <p class="rank">{{ replaceRp(t('rank.hexagonRank'), item.place) }}</p>
      <p class="total">{{ t('rank.hexagonTotal') }} {{ item.total }}</p>
    </div>
    <div ref="chartRef" class="radar" />
  </article>
</template>

<style scoped lang="scss">
.card {
  position: relative;
  overflow: visible;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 128px;
  gap: 8px;
  align-items: center;
  min-height: 124px;
  height: 152px;
  padding: 8px 10px;
  border-radius: $radius-md;
  border: 1px solid var(--c-border);
  background: var(--c-surface);

  &.place-1,
  &.place-2,
  &.place-3 {
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(110deg,
          transparent 20%,
          color-mix(in srgb, var(--shine) 22%, transparent) 48%,
          transparent 72%);
      background-size: 220% 100%;
      animation: hex-shine 4.8s ease-in-out infinite;
    }
  }

  &.place-1 {
    --shine: #e8c97a;
    border-color: color-mix(in srgb, #e8c97a 55%, var(--c-border));
    box-shadow: 0 0 18px rgba(232, 201, 122, 0.16);
  }

  &.place-2 {
    --shine: #c5d0dc;
    border-color: color-mix(in srgb, #c5d0dc 50%, var(--c-border));
    box-shadow: 0 0 16px rgba(197, 208, 220, 0.14);
  }

  &.place-3 {
    --shine: #d4a07a;
    border-color: color-mix(in srgb, #d4a07a 50%, var(--c-border));
    box-shadow: 0 0 16px rgba(212, 160, 122, 0.14);
  }
}

@keyframes hex-shine {
  0% {
    background-position: 120% 0;
    opacity: 0.45;
  }

  50% {
    opacity: 0.9;
  }

  100% {
    background-position: -120% 0;
    opacity: 0.45;
  }
}

.avatar-wrap {
  position: relative;
  width: 48px;
  height: 48px;
}

.avatar {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--c-bg-elevated);
  border: 1px solid var(--c-border);

  .fallback {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: 14px;
    color: var(--c-accent-soft);
  }

  img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: 50% 12%;
  }
}

.crown {
  position: absolute;
  top: -7px;
  right: -7px;
  z-index: 2;
  width: 18px;
  height: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));

  svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  &.crown-1 {
    color: #f0d078;
  }

  &.crown-2 {
    color: #d5dee8;
  }

  &.crown-3 {
    color: #e0a070;
  }
}

.meta {
  min-width: 0;
  position: relative;
  z-index: 1;

  h3 {
    margin: 0;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.en,
.rank,
.total {
  margin: 1px 0 0;
  font-size: 11px;
  color: var(--c-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.total {
  color: var(--c-accent-soft);
  font-variant-numeric: tabular-nums;
}

.radar {
  width: 128px;
  height: 128px;
  position: relative;
  z-index: 1;
  overflow: visible;
}

@media (max-width: 479px) {
  .card {
    grid-template-columns: 44px minmax(0, 1fr) 108px;
    height: 124px;
    min-height: 124px;
  }

  .radar {
    width: 108px;
    height: 108px;
  }
}
</style>
