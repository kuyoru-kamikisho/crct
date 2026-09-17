<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiFullscreen, mdiFullscreenExit } from '@mdi/js'
import * as echarts from 'echarts/core'
import { BarChart, PictorialBarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useSettingsStore } from '@/stores/settings'
import {
  exitChartFullscreen,
  isChartFullscreen,
  readThemeColors,
  requestChartFullscreen,
} from '@/utils/chartTheme'

echarts.use([BarChart, PictorialBarChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})

const { t, locale } = useI18n()
const settings = useSettingsStore()
const panelRef = ref(null)
const chartRef = ref(null)
const fullscreen = ref(false)
let chart = null
let resizeObs = null

function chartHeight() {
  return Math.max(260, props.items.length * 34 + 52)
}

function maxVote() {
  return Math.max(1, ...props.items.map((row) => Number(row.total) || 0))
}

function renderChart() {
  if (!chart) return
  const colors = readThemeColors()
  const dataMax = maxVote()
  const axisMax = dataMax * 1.1
  const totals = props.items.map((row) => Number(row.total) || 0)
  const barH = 14
  const blockW = 5
  const gapW = 3
  const gapColor = fullscreen.value ? colors.bg : colors.surface
  chart.setOption(
    {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 700,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.text, fontSize: 12 },
        formatter(params) {
          const list = Array.isArray(params) ? params : [params]
          const item = list.find((p) => p.seriesType === 'bar') || list[0]
          if (!item) return ''
          return `${item.name}<br/>${t('rank.votes')}：<b>${item.value}</b>`
        },
      },
      grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
      xAxis: {
        type: 'value',
        min: 0,
        max: axisMax,
        minInterval: 1,
        name: t('rank.votes'),
        nameTextStyle: { color: colors.muted, fontSize: 11 },
        axisLine: { lineStyle: { color: colors.border } },
        axisLabel: { color: colors.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: colors.border, opacity: 0.45 } },
      },
      yAxis: {
        type: 'category',
        data: props.items.map((row) => row.name),
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: colors.text, fontSize: 12, width: 88, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          name: t('rank.votes'),
          data: totals,
          barWidth: barH,
          barGap: '-100%',
          barCategoryGap: '32%',
          itemStyle: {
            borderRadius: 0,
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: colors.accent },
              { offset: 1, color: colors.star },
            ]),
          },
          emphasis: {
            itemStyle: { shadowBlur: 8, shadowColor: 'rgba(62, 207, 207, 0.4)' },
          },
          label: {
            show: true,
            position: 'right',
            color: colors.accentSoft,
            fontSize: 11,
          },
          z: 1,
        },
        {
          type: 'pictorialBar',
          data: totals,
          barGap: '-100%',
          barCategoryGap: '32%',
          symbol: 'rect',
          symbolRepeat: 'fixed',
          symbolClip: true,
          symbolBoundingData: axisMax,
          symbolSize: [gapW, barH + 2],
          symbolMargin: blockW,
          symbolOffset: [blockW, 0],
          itemStyle: { color: gapColor },
          silent: true,
          tooltip: { show: false },
          animation: false,
          z: 2,
        },
      ],
    },
    { notMerge: true },
  )
  const el = chartRef.value
  if (el) el.style.height = `${chartHeight()}px`
  chart.resize()
}

function toggleFullscreen() {
  if (isChartFullscreen(panelRef.value)) exitChartFullscreen()
  else requestChartFullscreen(panelRef.value)
}

function onFullscreenChange() {
  fullscreen.value = isChartFullscreen(panelRef.value)
  requestAnimationFrame(() => renderChart())
}

onMounted(() => {
  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  renderChart()
  resizeObs = new ResizeObserver(() => chart?.resize())
  if (panelRef.value) resizeObs.observe(panelRef.value)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange)
})

onUnmounted(() => {
  resizeObs?.disconnect()
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
  chart?.dispose()
  chart = null
})

watch(
  () => [props.items, locale.value, settings.theme],
  () => renderChart(),
  { deep: true },
)
</script>

<template>
  <section ref="panelRef" class="panel" :class="{ fullscreen }">
    <header class="head">
      <div>
        <h2>{{ t('rank.rankingTitle') }}</h2>
        <p>{{ t('rank.scrollHint') }}</p>
      </div>
      <button type="button" class="icon-btn" @click="toggleFullscreen">
        <svg-icon type="mdi" :size="18" :path="fullscreen ? mdiFullscreenExit : mdiFullscreen" />
        <span>{{ fullscreen ? t('rank.exitFullscreen') : t('rank.fullscreen') }}</span>
      </button>
    </header>
    <p v-if="loading" class="empty">{{ t('rank.loading') }}</p>
    <p v-else-if="!items.length" class="empty">{{ t('rank.noVotes') }}</p>
    <div v-show="!loading && items.length" class="scroll">
      <div ref="chartRef" class="chart" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.panel {
  border: 1px solid var(--c-border);
  border-radius: $radius-md;
  background: var(--c-surface);
  padding: 16px;
  min-width: 0;

  &.fullscreen {
    background: var(--c-bg);
    padding: 24px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}

.head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;

  h2 {
    margin: 0 0 4px;
    font-size: 16px;
  }

  p {
    margin: 0;
    color: var(--c-text-muted);
    font-size: 12px;
  }
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: $radius-sm;
  border: 1px solid var(--c-border);
  background: var(--c-bg-elevated);
  color: var(--c-text);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;

  :deep(svg) {
    fill: currentColor;
  }

  &:hover {
    border-color: var(--c-accent);
    color: var(--c-accent);
  }
}

.scroll {
  max-height: 520px;
  overflow: auto;
  padding-right: 4px;

  .fullscreen & {
    max-height: none;
    flex: 1;
  }
}

.chart {
  width: 100%;
  min-height: 260px;
}

.empty {
  margin: 24px 0;
  text-align: center;
  color: var(--c-text-muted);
  font-size: 13px;
}
</style>
