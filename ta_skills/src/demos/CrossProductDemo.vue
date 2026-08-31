<template>
  <DemoShell title="叉乘运算演示器（3D）" :onReset="reset">
    <template #params>
      <div class="field">
        <label>A.x <span class="val">{{ ax }}</span></label>
        <input type="range" min="-3" max="3" step="0.1" v-model.number="ax" />
      </div>
      <div class="field">
        <label>A.y <span class="val">{{ ay }}</span></label>
        <input type="range" min="-3" max="3" step="0.1" v-model.number="ay" />
      </div>
      <div class="field">
        <label>A.z <span class="val">{{ az }}</span></label>
        <input type="range" min="-3" max="3" step="0.1" v-model.number="az" />
      </div>
      <div class="field">
        <label>B.x <span class="val">{{ bx }}</span></label>
        <input type="range" min="-3" max="3" step="0.1" v-model.number="bx" />
      </div>
      <div class="field">
        <label>B.y <span class="val">{{ by }}</span></label>
        <input type="range" min="-3" max="3" step="0.1" v-model.number="by" />
      </div>
      <div class="field">
        <label>B.z <span class="val">{{ bz }}</span></label>
        <input type="range" min="-3" max="3" step="0.1" v-model.number="bz" />
      </div>
    </template>
    <template #stage>
      <Axis3D :vectors="vectors" />
    </template>
    <template #result>
      <div>A × B = (Ay Bz − Az By,　Az Bx − Ax Bz,　Ax By − Ay Bx)</div>
      <div>= ({{ fmt(ay) }}×{{ fmt(bz) }} − {{ fmt(az) }}×{{ fmt(by) }},
        {{ fmt(az) }}×{{ fmt(bx) }} − {{ fmt(ax) }}×{{ fmt(bz) }},
        {{ fmt(ax) }}×{{ fmt(by) }} − {{ fmt(ay) }}×{{ fmt(bx) }})</div>
      <div style="color:var(--accent)">= ({{ fmt(cx) }}, {{ fmt(cy) }}, {{ fmt(cz) }})</div>
      <div>|A×B| = {{ fmt(area) }}　（平行四边形面积）</div>
      <div>A·(A×B) = {{ fmt(ax * cx + ay * cy + az * cz) }} ≈ 0　（叉乘垂直于 A 和 B）</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'
import Axis3D from '../components/Axis3D.vue'
import { cross3, fmt, len3 } from '../utils/math.js'

export default {
  components: { DemoShell, Axis3D },
  data() {
    return { ax: 2, ay: 0.2, az: 0.1, bx: 0.3, by: 1.8, bz: 0.2 }
  },
  computed: {
    c() { return cross3(this.ax, this.ay, this.az, this.bx, this.by, this.bz) },
    cx() { return this.c[0] },
    cy() { return this.c[1] },
    cz() { return this.c[2] },
    area() { return len3(this.cx, this.cy, this.cz) },
    vectors() {
      return [
        { dir: [this.ax, this.ay, this.az], color: 0x4fd1c5, label: 'A' },
        { dir: [this.bx, this.by, this.bz], color: 0x7c9cff, label: 'B' },
        { dir: [this.cx, this.cy, this.cz], color: 0xe0af68, label: 'A×B' }
      ]
    }
  },
  methods: {
    fmt,
    reset() {
      this.ax = 2; this.ay = 0.2; this.az = 0.1
      this.bx = 0.3; this.by = 1.8; this.bz = 0.2
    }
  }
}
</script>
