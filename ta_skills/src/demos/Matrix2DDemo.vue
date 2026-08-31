<template>
  <DemoShell title="2D 矩阵变换演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>平移 tx <span class="val">{{ tx }}</span></label>
        <input type="range" min="-3" max="3" step="0.1" v-model.number="tx" />
      </div>
      <div class="field">
        <label>平移 ty <span class="val">{{ ty }}</span></label>
        <input type="range" min="-3" max="3" step="0.1" v-model.number="ty" />
      </div>
      <div class="field">
        <label>旋转 θ <span class="val">{{ rot }}°</span></label>
        <input type="range" min="-180" max="180" step="1" v-model.number="rot" />
      </div>
      <div class="field">
        <label>缩放 sx <span class="val">{{ sx }}</span></label>
        <input type="range" min="0.2" max="2.5" step="0.05" v-model.number="sx" />
      </div>
      <div class="field">
        <label>缩放 sy <span class="val">{{ sy }}</span></label>
        <input type="range" min="0.2" max="2.5" step="0.05" v-model.number="sy" />
      </div>
      <p class="hint">浅色是原始正方形，亮色是 T·R·S 之后。顺序不同结果不同。</p>
    </template>
    <template #stage>
      <Axis2D :range="5" :points="[]" :arrows="[]" :extras="extras" />
    </template>
    <template #result>
      <div>采用列向量：p' = T · R · S · p（先缩放，再旋转，再平移）</div>
      <div>S = diag({{ fmt(sx) }}, {{ fmt(sy) }})</div>
      <div>R = [[{{ fmt(c) }}, {{ fmt(-s) }}], [{{ fmt(s) }}, {{ fmt(c) }}]]　（θ={{ rot }}°）</div>
      <div>T 把原点移到 ({{ fmt(tx) }}, {{ fmt(ty) }})</div>
      <div style="color:var(--accent)">右上角顶点 (1,1) → ({{ fmt(p11[0]) }}, {{ fmt(p11[1]) }})</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'
import Axis2D from '../components/Axis2D.vue'
import { fmt, rad } from '../utils/math.js'

export default {
  components: { DemoShell, Axis2D },
  data() {
    return { tx: 1.2, ty: 0.6, rot: 25, sx: 1.4, sy: 0.9 }
  },
  computed: {
    c() { return Math.cos(rad(this.rot)) },
    s() { return Math.sin(rad(this.rot)) },
    local() {
      return [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    },
    world() {
      return this.local.map((p) => this.xform(p[0], p[1]))
    },
    extras() {
      return [
        { type: 'poly', points: this.local, fill: 'rgba(139,147,167,0.08)', stroke: '#3a4458' },
        { type: 'poly', points: this.world, fill: 'rgba(79,209,197,0.16)', stroke: '#4fd1c5' }
      ]
    },
    p11() { return this.xform(1, 1) }
  },
  methods: {
    fmt,
    reset() { this.tx = 1.2; this.ty = 0.6; this.rot = 25; this.sx = 1.4; this.sy = 0.9 },
    xform(x, y) {
      const xs = x * this.sx
      const ys = y * this.sy
      const xr = xs * this.c - ys * this.s
      const yr = xs * this.s + ys * this.c
      return [xr + this.tx, yr + this.ty]
    }
  }
}
</script>
