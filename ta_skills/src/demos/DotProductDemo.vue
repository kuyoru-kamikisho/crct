<template>
  <DemoShell title="点乘运算演示器" :onReset="reset">
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
      <p class="hint">金色虚线是 A 在 B 方向上的投影。拖动 A、B 看夹角变化。</p>
    </template>
    <template #stage>
      <Axis2D :points="pts" :arrows="arrows" :extras="extras" @change="onPts" />
    </template>
    <template #result>
      <div>A · B = Ax·Bx + Ay·By = {{ fmt(A.x) }}×{{ fmt(B.x) }} + {{ fmt(A.y) }}×{{ fmt(B.y) }} = <b style="color:var(--accent)">{{ fmt(dot) }}</b></div>
      <div>|A| = {{ fmt(lenA) }}　|B| = {{ fmt(lenB) }}　θ = {{ fmt(deg) }}°</div>
      <div>|A||B|cosθ = {{ fmt(lenA) }} × {{ fmt(lenB) }} × {{ fmt(Math.cos(ang)) }} = {{ fmt(lenA * lenB * Math.cos(ang)) }}</div>
      <div>投影长度 |A|cosθ = {{ fmt(projLen) }}（点乘 / |B|）</div>
      <div v-if="dot > 0.05" style="color:var(--ok)">点乘 &gt; 0：夹角为锐角，大致同向。</div>
      <div v-else-if="dot < -0.05" style="color:var(--danger)">点乘 &lt; 0：夹角为钝角，大致反向。</div>
      <div v-else style="color:var(--warn)">点乘 ≈ 0：接近垂直。光照里 N·L≤0 表示背光。</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'
import Axis2D from '../components/Axis2D.vue'
import { angleBetween, deg as toDeg, dot2, fmt, len2 } from '../utils/math.js'

export default {
  components: { DemoShell, Axis2D },
  data() {
    return { A: { x: 3, y: 1.2 }, B: { x: 2, y: 2.5 } }
  },
  computed: {
    lenA() { return len2(this.A.x, this.A.y) },
    lenB() { return len2(this.B.x, this.B.y) },
    dot() { return dot2(this.A.x, this.A.y, this.B.x, this.B.y) },
    ang() { return angleBetween(this.A.x, this.A.y, this.B.x, this.B.y) },
    deg() { return toDeg(this.ang) },
    projLen() { return this.lenB ? this.dot / this.lenB : 0 },
    projPt() {
      const lb2 = this.B.x * this.B.x + this.B.y * this.B.y
      if (!lb2) return { x: 0, y: 0 }
      const t = this.dot / lb2
      return { x: this.B.x * t, y: this.B.y * t }
    },
    pts() {
      return [
        { id: 'A', x: this.A.x, y: this.A.y, color: '#4fd1c5', label: 'A' },
        { id: 'B', x: this.B.x, y: this.B.y, color: '#7c9cff', label: 'B' },
        { id: 'P', x: this.projPt.x, y: this.projPt.y, color: '#e0af68', label: 'proj', draggable: false }
      ]
    },
    arrows() {
      return [
        { from: 'O', to: 'A', color: '#4fd1c5' },
        { from: 'O', to: 'B', color: '#7c9cff' },
        { from: 'A', to: 'P', color: '#e0af68', dashed: true }
      ]
    },
    extras() {
      return [{
        type: 'arc',
        from: Math.atan2(this.A.y, this.A.x),
        to: Math.atan2(this.B.y, this.B.x),
        radius: 0.9,
        color: '#e0af68',
        label: 'θ'
      }]
    }
  },
  methods: {
    fmt,
    reset() { this.A = { x: 3, y: 1.2 }; this.B = { x: 2, y: 2.5 } },
    onPts(pts) {
      const a = pts.find((p) => p.id === 'A')
      const b = pts.find((p) => p.id === 'B')
      if (a) this.A = { x: a.x, y: a.y }
      if (b) this.B = { x: b.x, y: b.y }
    }
  }
}
</script>
