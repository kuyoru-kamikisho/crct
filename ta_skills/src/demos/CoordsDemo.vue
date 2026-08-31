<template>
  <DemoShell title="坐标系演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>点 P.x <span class="val">{{ x }}</span></label>
        <input type="range" min="-5" max="5" step="0.1" v-model.number="x" />
      </div>
      <div class="field">
        <label>点 P.y <span class="val">{{ y }}</span></label>
        <input type="range" min="-5" max="5" step="0.1" v-model.number="y" />
      </div>
      <p class="hint">拖动 P。虚线是它在 x、y 轴上的投影——这就是「坐标」的几何意义。</p>
    </template>
    <template #stage>
      <Axis2D :points="pts" :arrows="arrows" :extras="extras" @change="onPts" />
    </template>
    <template #result>
      <div>原点 O = (0, 0)，向右为 +x，向上为 +y（数学课上的右手笛卡尔系）。</div>
      <div>P 的坐标 = （沿 x 走了多少，沿 y 走了多少）= ({{ fmt(x) }}, {{ fmt(y) }})</div>
      <div>到原点距离 |OP| = √(x²+y²) = {{ fmt(Math.hypot(x, y)) }}</div>
      <div style="color:var(--accent)">Unity 世界空间默认 Y 向上；部分 DCC / DirectX 文档会看到 Y 向上或 Z 向上的差别，换引擎时先确认。</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'
import Axis2D from '../components/Axis2D.vue'
import { fmt } from '../utils/math.js'

export default {
  components: { DemoShell, Axis2D },
  data() {
    return { x: 2.4, y: 1.6 }
  },
  computed: {
    pts() {
      return [
        { id: 'P', x: this.x, y: this.y, color: '#4fd1c5', label: 'P' },
        { id: 'Px', x: this.x, y: 0, color: '#7c9cff', label: 'x', draggable: false },
        { id: 'Py', x: 0, y: this.y, color: '#e0af68', label: 'y', draggable: false }
      ]
    },
    arrows() {
      return [{ from: 'O', to: 'P', color: '#4fd1c5' }]
    },
    extras() {
      return [
        { type: 'line', from: [this.x, 0], to: [this.x, this.y], color: '#7c9cff', dashed: true },
        { type: 'line', from: [0, this.y], to: [this.x, this.y], color: '#e0af68', dashed: true }
      ]
    }
  },
  methods: {
    fmt,
    reset() { this.x = 2.4; this.y = 1.6 },
    onPts(pts) {
      const p = pts.find((i) => i.id === 'P')
      if (p) { this.x = p.x; this.y = p.y }
    }
  }
}
</script>
