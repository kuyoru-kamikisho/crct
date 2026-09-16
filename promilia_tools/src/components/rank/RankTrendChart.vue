<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiFullscreen, mdiFullscreenExit } from '@mdi/js'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useSettingsStore } from '@/stores/settings'
import {
  SERIES_PALETTE,
  exitChartFullscreen,
  isChartFullscreen,
  readThemeColors,
  requestChartFullscreen,
} from '@/utils/chartTheme'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer])

const props = defineProps({
  series: { type: Array, default: () => [] },
  ranking: { type: Array, default: () => [] },
  granularity: { type: String, default: 'day' },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:granularity'])

const { t, locale } = useI18n()
const settings = useSettingsStore()
const panelRef = ref(null)
const chartRef = ref(null)
const fullscreen = ref(false)
const visibleIds = ref([])
let chart = null
let resizeObs = null

const countLabel = computed(() =>
  props.granularity === 'month' ? t('rank.monthlyVotes') : t('rank.dailyVotes'),
)

const chipRows = computed(() => {
  const names = Object.fromEntries(props.ranking.map((row) => [row.id, row.name]))
  return props.series.map((row) => ({ id: row.id, name: names[row.id] || row.name || row.id }))
})

const periods = computed(() => {
  const set = new Set()
  for (const row of props.series) {
    for (const point of row.points || []) set.add(point.period)
  }
  return [...set].sort()
})

const displaySeries = computed(() => {
  const allow = new Set(visibleIds.value)
  return props.series.filter((row) => allow.has(row.id))
})

function defaultVisible() {
  const valid = new Set(props.series.map((row) => row.id))
  const fromRank = props.ranking.map((row) => row.id).filter((id) => valid.has(id)).slice(0, 8)
  return fromRank.length ? fromRank : [...valid].slice(0, 8)
}

function syncVisible() {
  const valid = new Set(props.series.map((row) => row.id))
  const current = visibleIds.value.filter((id) => valid.has(id))
  visibleIds.value = current.length ? current : defaultVisible()
}

function toggleSeries(id) {
  if (visibleIds.value.includes(id)) {
    if (visibleIds.value.length === 1) return
    visibleIds.value = visibleIds.value.filter((item) => item !== id)
    return
  }
  visibleIds.value = [...visibleIds.value, id]
}

function showTop() {
  visibleIds.value = defaultVisible()
}

function showAll() {
  visibleIds.value = props.series.map((row) => row.id)
}

function renderChart() {
  if (!chart) return
  const colors = readThemeColors()
  const axis = periods.value
  const rows = displaySeries.value
  chart.setOption(
    {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 700,
      animationEasing: 'cubicOut',
      color: SERIES_PALETTE,
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        textStyle: { color: colors.text, fontSize: 12 },
      },
      legend: {
        type: 'scroll',
        top: 0,
        textStyle: { color: colors.muted, fontSize: 11 },
        pageIconColor: colors.accent,
        pageTextStyle: { color: colors.muted },
      },
      grid: { top: 48, right: 18, bottom: 56, left: 12, containLabel: true },
      xAxis: {
        type: 'category',
        data: axis,
        boundaryGap: false,
        axisLine: { lineStyle: { color: colors.border } },
        axisLabel: { color: colors.muted, fontSize: 11, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        name: countLabel.value,
        nameTextStyle: { color: colors.muted, fontSize: 11 },
        axisLine: { show: false },
        axisLabel: { color: colors.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: colors.border, opacity: 0.45 } },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 18,
          bottom: 8,
          borderColor: colors.border,
          fillerColor: 'rgba(62, 207, 207, 0.16)',
          handleStyle: { color: colors.accent },
          textStyle: { color: colors.muted },
        },
      ],
      series: rows.map((row) => {
        const map = Object.fromEntries((row.points || []).map((p) => [p.period, Number(p.count) || 0]))
        return {
          name: row.name,
          type: 'line',
          smooth: 0.35,
          showSymbol: false,
          symbol: 'none',
          lineStyle: { width: 2.4 },
          areaStyle: { opacity: 0.07 },
          emphasis: { focus: 'series' },
          data: axis.map((period) => map[period] ?? 0),
        }
      }),
    },
    { notMerge: true },
  )
  chart.resize()
}

function toggleFullscreen() {
  if (isChartFullscreen(panelRef.value)) exitChartFullscreen()
  else requestChartFullscreen(panelRef.value)
}

function onFullscreenChange() {
  fullscreen.value = isChartFullscreen(panelRef.value)
  requestAnimationFrame(() => chart?.resize())
}

onMounted(() => {
  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  syncVisible()
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
  () => [props.series, props.ranking],
  () => {
    syncVisible()
    renderChart()
  },
  { deep: true },
)

watch(
  () => [props.granularity, locale.value, settings.theme, visibleIds.value],
  () => renderChart(),
  { deep: true },
)
</script>

<template>
  <section ref="panelRef" class="panel" :class="{ fullscreen }">
    <header class="head">
      <div>
        <h2>{{ t('rank.trendTitle') }}</h2>
        <p>{{ t('rank.zoomHint') }}</p>
      </div>
      <div class="tools">
        <div class="seg" role="tablist">
          <button type="button" :class="{ on: granularity === 'day' }" @click="emit('update:granularity', 'day')">
            {{ t('rank.trendDaily') }}
          </button>
          <button
            type="button"
            :class="{ on: granularity === 'month' }"
            @click="emit('update:granularity', 'month')"
          >
            {{ t('rank.trendMonthly') }}
          </button>
        </div>
        <button type="button" class="icon-btn" @click="toggleFullscreen">
          <svg-icon type="mdi" :size="18" :path="fullscreen ? mdiFullscreenExit : mdiFullscreen" />
          <span>{{ fullscreen ? t('rank.exitFullscreen') : t('rank.fullscreen') }}</span>
        </button>
      </div>
    </header>

    <div class="series-bar">
      <span>{{ t('rank.showSeries') }}</span>
      <button type="button" class="chip" @click="showTop">{{ t('rank.showTop') }}</button>
      <button type="button" class="chip" @click="showAll">{{ t('rank.showAll') }}</button>
      <button
        v-for="row in chipRows"
        :key="row.id"
        type="button"
        class="chip"
        :class="{ on: visibleIds.includes(row.id) }"
        @click="toggleSeries(row.id)"
      >
        {{ row.name }}
      </button>
    </div>

    <p v-if="loading" class="empty">{{ t('rank.loading') }}</p>
    <p v-else-if="!series.length" class="empty">{{ t('rank.noVotes') }}</p>
    <div v-show="!loading && series.length" ref="chartRef" class="chart" />
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
  flex-wrap: wrap;
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

.tools {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.seg {
  display: inline-flex;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  overflow: hidden;

  button {
    height: 32px;
    padding: 0 12px;
    border: 0;
    background: transparent;
    color: var(--c-text-muted);
    cursor: pointer;
    font-size: 12px;

    &.on {
      background: color-mix(in srgb, var(--c-accent) 18%, transparent);
      color: var(--c-accent);
    }
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

.series-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--c-text-muted);
}

.chip {
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-text-muted);
  cursor: pointer;
  font-size: 12px;

  &.on {
    border-color: var(--c-accent);
    color: var(--c-accent-soft);
    background: color-mix(in srgb, var(--c-accent) 12%, transparent);
  }
}

.chart {
  width: 100%;
  height: 420px;

  .fullscreen & {
    flex: 1;
    min-height: 420px;
  }
}

.empty {
  margin: 24px 0;
  text-align: center;
  color: var(--c-text-muted);
  font-size: 13px;
}
</style>
