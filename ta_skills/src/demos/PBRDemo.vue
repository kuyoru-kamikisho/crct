<template>
  <DemoShell title="PBR 旋钮演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>金属度 metallic <span class="val">{{ metal }}</span></label>
        <input type="range" min="0" max="1" step="0.01" v-model.number="metal" />
      </div>
      <div class="field">
        <label>粗糙度 roughness <span class="val">{{ rough }}</span></label>
        <input type="range" min="0.04" max="1" step="0.01" v-model.number="rough" />
      </div>
      <div class="field">
        <label>反照率 albedo <span class="val">{{ albedo }}</span></label>
        <input type="range" min="0.05" max="1" step="0.01" v-model.number="albedo" />
      </div>
      <div class="field">
        <label>灯光方位 <span class="val">{{ yaw }}°</span></label>
        <input type="range" min="0" max="360" step="1" v-model.number="yaw" />
      </div>
    </template>
    <template #stage>
      <canvas ref="cv" class="cv"></canvas>
    </template>
    <template #result>
      <div>F0 = mix(0.04, albedo, metallic)　金属用自身颜色当镜面色，非金属固定约 4% 反射。</div>
      <div>漫反射 albedo × (1 − metallic)　金属没有漫反射。</div>
      <div>高光宽度随 roughness 变大（这里用简化 Blinn + 分布宽度示意，不是完整 Disney BRDF）。</div>
      <div style="color:var(--accent)">F0≈{{ fmt(f0) }}　漫反射系数={{ fmt(1 - metal) }}　高光锐度 n≈{{ shininess }}</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'
import { clamp, fmt, rad } from '../utils/math.js'

export default {
  components: { DemoShell },
  data() {
    return { metal: 0, rough: 0.35, albedo: 0.7, yaw: 35 }
  },
  computed: {
    f0() { return 0.04 * (1 - this.metal) + this.albedo * this.metal },
    shininess() { return Math.max(2, Math.round(Math.pow(1 - this.rough, 2) * 128)) }
  },
  watch: {
    metal() { this.draw() },
    rough() { this.draw() },
    albedo() { this.draw() },
    yaw() { this.draw() }
  },
  mounted() {
    this.ro = new ResizeObserver(() => this.draw())
    this.ro.observe(this.$refs.cv.parentElement)
    this.draw()
  },
  beforeUnmount() { this.ro && this.ro.disconnect() },
  methods: {
    fmt,
    reset() { this.metal = 0; this.rough = 0.35; this.albedo = 0.7; this.yaw = 35 },
    draw() {
      const cv = this.$refs.cv
      const parent = cv.parentElement
      const w = parent.clientWidth
      const h = Math.max(parent.clientHeight, 280)
      const dpr = Math.min(devicePixelRatio || 1, 2)
      cv.width = w * dpr
      cv.height = h * dpr
      cv.style.width = w + 'px'
      cv.style.height = h + 'px'
      const ctx = cv.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#0c0e12'
      ctx.fillRect(0, 0, w, h)
      const cx = w / 2
      const cy = h / 2
      const R = Math.min(w, h) * 0.36
      const cssSize = Math.ceil(R * 2)
      const yaw = rad(this.yaw)
      const L = [Math.sin(yaw) * 0.7, 0.55, Math.cos(yaw) * 0.7]
      const len = Math.hypot(L[0], L[1], L[2]) || 1
      L[0] /= len; L[1] /= len; L[2] /= len
      const V = [0, 0, 1]
      const size = Math.ceil(cssSize * dpr)
      const img = ctx.createImageData(size, size)
      const kd = this.albedo * (1 - this.metal)
      const f0 = this.f0
      const n = this.shininess
      const baseR = 40 + this.albedo * 180
      const baseG = 50 + this.albedo * 160
      const baseB = 70 + this.albedo * 140
      const specR = this.metal > 0.5 ? baseR : 255
      const specG = this.metal > 0.5 ? baseG : 255
      const specB = this.metal > 0.5 ? baseB : 255
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const nx = (px + 0.5) / size * 2 - 1
          const ny = 1 - (py + 0.5) / size * 2
          const d = nx * nx + ny * ny
          const i = (py * size + px) * 4
          if (d > 1) { img.data[i + 3] = 0; continue }
          const nz = Math.sqrt(1 - d)
          const ndotl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])
          const hx = L[0] + V[0], hy = L[1] + V[1], hz = L[2] + V[2]
          const hl = Math.hypot(hx, hy, hz) || 1
          const ndoth = Math.max(0, nx * hx / hl + ny * hy / hl + nz * hz / hl)
          const spec = f0 * Math.pow(ndoth, n)
          const diff = kd * ndotl
          const cr = clamp(0.04 + diff * baseR / 255 + spec * specR / 255, 0, 1)
          const cg = clamp(0.04 + diff * baseG / 255 + spec * specG / 255, 0, 1)
          const cb = clamp(0.04 + diff * baseB / 255 + spec * specB / 255, 0, 1)
          img.data[i] = Math.round(Math.pow(cr, 1 / 2.2) * 255)
          img.data[i + 1] = Math.round(Math.pow(cg, 1 / 2.2) * 255)
          img.data[i + 2] = Math.round(Math.pow(cb, 1 / 2.2) * 255)
          img.data[i + 3] = 255
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.putImageData(img, (cx - cssSize / 2) * dpr, (cy - cssSize / 2) * dpr)
    }
  }
}
</script>

<style scoped>
.cv { display: block; width: 100%; height: 100%; }
</style>
