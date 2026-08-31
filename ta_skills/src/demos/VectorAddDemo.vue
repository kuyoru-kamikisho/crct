<template>
  <DemoShell title="向量加减演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>A.x <span class="val">{{ A.x }}</span></label>
        <input type="range" min="-5" max="5" step="0.1" v-model.number="A.x" />
      </div>
      <div class="field">
        <label>A.y <span class="val">{{ A.y }}</span></label>
        <input type="range" min="-5" max="5" step="0.1" v-model.number="A.y" />
      </div>
      <div class="field">
        <label>B.x <span class="val">{{ B.x }}</span></label>
        <input type="range" min="-5" max="5" step="0.1" v-model.number="B.x" />
      </div>
      <div class="field">
        <label>B.y <span class="val">{{ B.y }}</span></label>
        <input type="range" min="-5" max="5" step="0.1" v-model.number="B.y" />
      </div>
      <p class="hint">也可直接拖动图上的 A、B 两点。平行四边形的对角就是 A+B。</p>
    </template>
    <template #stage>
      <Axis2D :points="pts" :arrows="arrows" :extras="extras" @change="onPts" />
    </template>
    <template #result>
      <div>A = ({{ fmt(A.x) }}, {{ fmt(A.y) }})　|A| = {{ fmt(lenA) }}</div>
      <div>B = ({{ fmt(B.x) }}, {{ fmt(B.y) }})　|B| = {{ fmt(lenB) }}</div>
      <div>A + B = ({{ fmt(A.x) }}+{{ fmt(B.x) }}, {{ fmt(A.y) }}+{{ fmt(B.y) }}) = ({{ fmt(sum.x) }}, {{ fmt(sum.y) }})</div>
      <div>A − B = ({{ fmt(A.x - B.x) }}, {{ fmt(A.y - B.y) }})</div>
      <div style="color:var(--accent)">单位向量 Â = A / |A| = ({{ fmt(A.x / (lenA || 1)) }}, {{ fmt(A.y / (lenA || 1)) }})</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'
import Axis2D from '../components/Axis2D.vue'
import { fmt, len2 } from '../utils/math.js'

export default {
  components: { DemoShell, Axis2D },
  data() {
    return { A: { x: 2, y: 1 }, B: { x: 1, y: 2 } }
  },
  computed: {
    pts() {
      return [
        { id: 'A', x: this.A.x, y: this.A.y, color: '#4fd1c5', label: 'A' },
        { id: 'B', x: this.B.x, y: this.B.y, color: '#7c9cff', label: 'B' },
        { id: 'S', x: this.sum.x, y: this.sum.y, color: '#e0af68', label: 'A+B', draggable: false }
      ]
    },
    arrows() {
      return [
        { from: 'O', to: 'A', color: '#4fd1c5', label: 'A' },
        { from: 'O', to: 'B', color: '#7c9cff', label: 'B' },
        { from: 'O', to: 'S', color: '#e0af68', label: 'A+B' },
        { from: 'A', to: 'S', color: '#7c9cff', dashed: true },
        { from: 'B', to: 'S', color: '#4fd1c5', dashed: true }
      ]
    },
    extras() {
      return [{
        type: 'poly',
        points: [[0, 0], [this.A.x, this.A.y], [this.sum.x, this.sum.y], [this.B.x, this.B.y]],
        fill: 'rgba(224,175,104,0.08)',
        stroke: 'rgba(224,175,104,0.35)'
      }]
    },
    sum() { return { x: this.A.x + this.B.x, y: this.A.y + this.B.y } },
    lenA() { return len2(this.A.x, this.A.y) },
    lenB() { return len2(this.B.x, this.B.y) }
  },
  methods: {
    fmt,
    reset() { this.A = { x: 2, y: 1 }; this.B = { x: 1, y: 2 } },
    onPts(pts) {
      const a = pts.find((p) => p.id === 'A')
      const b = pts.find((p) => p.id === 'B')
      if (a) this.A = { x: a.x, y: a.y }
      if (b) this.B = { x: b.x, y: b.y }
    }
  }
}
</script>
