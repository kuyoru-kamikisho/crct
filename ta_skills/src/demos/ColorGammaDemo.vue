<template>
  <DemoShell title="Gamma / 线性空间演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>光照强度 I <span class="val">{{ I }}</span></label>
        <input type="range" min="0" max="1" step="0.01" v-model.number="I" />
      </div>
      <div class="field">
        <label>Gamma <span class="val">{{ gamma }}</span></label>
        <input type="range" min="1" max="2.4" step="0.05" v-model.number="gamma" />
      </div>
      <p class="hint">左：在 sRGB 灰度上直接乘 I（错误）。右：线性里乘 I 再编码回显示（正确）。</p>
    </template>
    <template #stage>
      <canvas ref="cv" class="cv"></canvas>
    </template>
    <template #result>
      <div>显示器亮度 ≈ (电压)^γ，γ≈2.2。中间灰 0.5 编码对应的真实亮度大约是 0.5^{2.2}≈0.22，不是一半。</div>
      <div>错误：display = albedo_srgb × I　→ 中间值 {{ fmt(wrong) }}</div>
      <div>正确：linear = albedo_srgb^{γ}，lit = linear × I，display = lit^{1/γ}　→ {{ fmt(right) }}</div>
      <div style="color:var(--accent)">所以「一半光」不该把 128 改成 64。要在线性空间运算。</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'
import { fmt } from '../utils/math.js'

export default {
  components: { DemoShell },
  data() {
    return { I: 0.5, gamma: 2.2 }
  },
  computed: {
    wrong() { return 0.5 * this.I },
    right() {
      const lin = Math.pow(0.5, this.gamma)
      return Math.pow(lin * this.I, 1 / this.gamma)
    }
  },
  watch: {
    I() { this.draw() },
    gamma() { this.draw() }
  },
  mounted() {
    this.ro = new ResizeObserver(() => this.draw())
    this.ro.observe(this.$refs.cv.parentElement)
    this.draw()
  },
  beforeUnmount() { this.ro && this.ro.disconnect() },
  methods: {
    fmt,
    reset() { this.I = 0.5; this.gamma = 2.2 },
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

      const pad = 36
      const bw = (w - pad * 3) / 2
      const bh = h - 80
      const drawBar = (x, t, label, color) => {
        ctx.fillStyle = '#1c2230'
        ctx.fillRect(x, 40, bw, bh)
        const g = Math.round(t * 255)
        ctx.fillStyle = `rgb(${g},${g},${g})`
        ctx.fillRect(x, 40 + bh * (1 - t), bw, bh * t)
        ctx.fillStyle = color
        ctx.font = '13px IBM Plex Sans, sans-serif'
        ctx.fillText(label, x, 28)
        ctx.font = '12px IBM Plex Mono, monospace'
        ctx.fillText('out=' + t.toFixed(2), x, h - 16)
      }
      drawBar(pad, this.wrong, '错误：sRGB 里直接乘光', '#f07178')
      drawBar(pad * 2 + bw, this.right, '正确：线性乘光再编码', '#4fd1c5')
    }
  }
}
</script>

<style scoped>
.cv { display: block; width: 100%; height: 100%; }
</style>
