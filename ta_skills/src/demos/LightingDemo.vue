<template>
  <DemoShell title="Lambert / Phong 光照演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>灯光方位角 <span class="val">{{ yaw }}°</span></label>
        <input type="range" min="0" max="360" step="1" v-model.number="yaw" />
      </div>
      <div class="field">
        <label>灯光仰角 <span class="val">{{ pitch }}°</span></label>
        <input type="range" min="5" max="89" step="1" v-model.number="pitch" />
      </div>
      <div class="field">
        <label>漫反射 kd <span class="val">{{ kd }}</span></label>
        <input type="range" min="0" max="1" step="0.01" v-model.number="kd" />
      </div>
      <div class="field">
        <label>高光 ks <span class="val">{{ ks }}</span></label>
        <input type="range" min="0" max="1" step="0.01" v-model.number="ks" />
      </div>
      <div class="field">
        <label>光泽度 n <span class="val">{{ n }}</span></label>
        <input type="range" min="1" max="64" step="1" v-model.number="n" />
      </div>
      <div class="field">
        <label>环境光 ka <span class="val">{{ ka }}</span></label>
        <input type="range" min="0" max="0.4" step="0.01" v-model.number="ka" />
      </div>
    </template>
    <template #stage>
      <canvas ref="cv" class="cv"></canvas>
    </template>
    <template #result>
      <div>视点 V 从屏幕前方看向球心。L 由方位/仰角给出。N 是球面上该点的法线。</div>
      <div>Lambert 漫反射 = kd × max(N·L, 0)</div>
      <div>Phong 高光 = ks × max(R·V, 0)^n　其中 R = reflect(-L, N)</div>
      <div>最终 = ka + diffuse + specular（经验模型，未做能量守恒）</div>
      <div style="color:var(--accent)">球心处 N=(0,0,1) 时 N·L = {{ fmt(ndotl) }}，高光项示意 {{ fmt(specHint) }}</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'
import { clamp, fmt, rad } from '../utils/math.js'

export default {
  components: { DemoShell },
  data() {
    return { yaw: 40, pitch: 35, kd: 0.7, ks: 0.55, n: 16, ka: 0.08 }
  },
  computed: {
    L() {
      const p = rad(this.pitch)
      const y = rad(this.yaw)
      const x = Math.cos(p) * Math.sin(y)
      const yy = Math.sin(p)
      const z = Math.cos(p) * Math.cos(y)
      return [x, yy, z]
    },
    ndotl() {
      return clamp(this.L[2], 0, 1)
    },
    specHint() {
      const N = [0, 0, 1]
      const L = this.L
      const nd = N[0] * L[0] + N[1] * L[1] + N[2] * L[2]
      const Rx = 2 * nd * N[0] - L[0]
      const Ry = 2 * nd * N[1] - L[1]
      const Rz = 2 * nd * N[2] - L[2]
      const rv = clamp(Rx * 0 + Ry * 0 + Rz * 1, 0, 1)
      return this.ks * Math.pow(rv, this.n)
    }
  },
  watch: {
    yaw() { this.draw() },
    pitch() { this.draw() },
    kd() { this.draw() },
    ks() { this.draw() },
    n() { this.draw() },
    ka() { this.draw() }
  },
  mounted() {
    this.ro = new ResizeObserver(() => this.draw())
    this.ro.observe(this.$refs.cv.parentElement)
    this.draw()
  },
  beforeUnmount() { this.ro && this.ro.disconnect() },
  methods: {
    fmt,
    reset() { this.yaw = 40; this.pitch = 35; this.kd = 0.7; this.ks = 0.55; this.n = 16; this.ka = 0.08 },
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
      const L = this.L
      const V = [0, 0, 1]
      const cssSize = Math.ceil(R * 2)
      const size = Math.ceil(cssSize * dpr)
      const img = ctx.createImageData(size, size)
      for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
          const nx = (px + 0.5) / size * 2 - 1
          const ny = 1 - (py + 0.5) / size * 2
          const d = nx * nx + ny * ny
          const i = (py * size + px) * 4
          if (d > 1) {
            img.data[i + 3] = 0
            continue
          }
          const nz = Math.sqrt(1 - d)
          const ndotl = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2])
          const Rx = 2 * ndotl * nx - L[0]
          const Ry = 2 * ndotl * ny - L[1]
          const Rz = 2 * ndotl * nz - L[2]
          const rdotv = Math.max(0, Rx * V[0] + Ry * V[1] + Rz * V[2])
          const spec = this.ks * Math.pow(rdotv, this.n)
          const diff = this.kd * ndotl
          const c = clamp(this.ka + diff + spec, 0, 1)
          const g = Math.round(Math.pow(c, 1 / 2.2) * 255)
          img.data[i] = Math.round(g * 0.75)
          img.data[i + 1] = Math.round(g * 0.95)
          img.data[i + 2] = g
          img.data[i + 3] = 255
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.putImageData(img, (cx - cssSize / 2) * dpr, (cy - cssSize / 2) * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      ctx.strokeStyle = '#e0af68'
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + L[0] * R * 1.25, cy - L[1] * R * 1.25)
      ctx.stroke()
      ctx.fillStyle = '#e0af68'
      ctx.font = '12px IBM Plex Sans, sans-serif'
      ctx.fillText('L', cx + L[0] * R * 1.3, cy - L[1] * R * 1.3)
    }
  }
}
</script>

<style scoped>
.cv { display: block; width: 100%; height: 100%; }
</style>
