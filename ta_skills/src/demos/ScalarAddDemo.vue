<template>
  <DemoShell title="标量加法演示器：为什么 1+1=2" :onReset="reset">
    <template #params>
      <div class="field">
        <label>左加数 a <span class="val">{{ a }}</span></label>
        <input type="range" min="-5" max="5" step="1" v-model.number="a" />
      </div>
      <div class="field">
        <label>右加数 b <span class="val">{{ b }}</span></label>
        <input type="range" min="-5" max="5" step="1" v-model.number="b" />
      </div>
      <p class="hint">数轴上：先走到 a，再沿同一条线走 b 格。终点就是和。</p>
    </template>
    <template #stage>
      <canvas ref="cv" class="cv"></canvas>
    </template>
    <template #result>
      <div>a = {{ a }}，b = {{ b }}</div>
      <div>从原点向{{ a >= 0 ? '右' : '左' }}走 |a| = {{ Math.abs(a) }} 格，到达 {{ a }}</div>
      <div>再向{{ b >= 0 ? '右' : '左' }}走 |b| = {{ Math.abs(b) }} 格</div>
      <div style="color:var(--accent)">终点 = a + b = {{ a + b }}</div>
      <div v-if="a === 1 && b === 1">所以 1+1=2：两段长度为 1 的位移首尾相接，总位移是 2。</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'

export default {
  components: { DemoShell },
  data() {
    return { a: 1, b: 1 }
  },
  watch: {
    a() { this.draw() },
    b() { this.draw() }
  },
  mounted() {
    this.ro = new ResizeObserver(() => this.draw())
    this.ro.observe(this.$refs.cv.parentElement)
    this.draw()
  },
  beforeUnmount() {
    this.ro && this.ro.disconnect()
  },
  methods: {
    reset() {
      this.a = 1
      this.b = 1
    },
    draw() {
      const cv = this.$refs.cv
      if (!cv) return
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

      const range = 8
      const ox = w / 2
      const oy = h / 2
      const s = (w - 64) / (2 * range)
      const X = (n) => ox + n * s

      ctx.strokeStyle = '#3a4458'
      ctx.beginPath()
      ctx.moveTo(32, oy)
      ctx.lineTo(w - 32, oy)
      ctx.stroke()
      ctx.fillStyle = '#8b93a7'
      ctx.font = '11px IBM Plex Mono, monospace'
      ctx.textAlign = 'center'
      for (let i = -range; i <= range; i++) {
        ctx.beginPath()
        ctx.moveTo(X(i), oy - 6)
        ctx.lineTo(X(i), oy + 6)
        ctx.stroke()
        ctx.fillText(String(i), X(i), oy + 20)
      }

      const drawSeg = (from, to, y, color, label) => {
        ctx.strokeStyle = color
        ctx.fillStyle = color
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(X(from), oy + y)
        ctx.lineTo(X(to), oy + y)
        ctx.stroke()
        const dir = to >= from ? 1 : -1
        const tip = X(to)
        ctx.beginPath()
        ctx.moveTo(tip, oy + y)
        ctx.lineTo(tip - 8 * dir, oy + y - 5)
        ctx.lineTo(tip - 8 * dir, oy + y + 5)
        ctx.fill()
        ctx.font = '12px IBM Plex Sans, sans-serif'
        ctx.fillText(label, (X(from) + X(to)) / 2, oy + y - 10)
      }

      drawSeg(0, this.a, -28, '#4fd1c5', 'a')
      drawSeg(this.a, this.a + this.b, 28, '#7c9cff', 'b')
      ctx.beginPath()
      ctx.arc(X(this.a + this.b), oy, 6, 0, Math.PI * 2)
      ctx.fillStyle = '#e0af68'
      ctx.fill()
      ctx.fillStyle = '#e0af68'
      ctx.fillText('和', X(this.a + this.b), oy - 48)
    }
  }
}
</script>

<style scoped>
.cv { display: block; width: 100%; height: 100%; }
</style>
