<template>
  <DemoShell title="UV 映射演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>U 偏移 <span class="val">{{ ou }}</span></label>
        <input type="range" min="-1" max="1" step="0.01" v-model.number="ou" />
      </div>
      <div class="field">
        <label>V 偏移 <span class="val">{{ ov }}</span></label>
        <input type="range" min="-1" max="1" step="0.01" v-model.number="ov" />
      </div>
      <div class="field">
        <label>Tiling <span class="val">{{ tile }}</span></label>
        <input type="range" min="0.5" max="4" step="0.1" v-model.number="tile" />
      </div>
      <p class="hint">左：UV 空间（0~1 的正方形）。右：同一套 UV 贴到平面上。拖动左图顶点可改 UV。</p>
    </template>
    <template #stage>
      <div class="split">
        <canvas ref="uv" @pointerdown="down" @pointermove="move" @pointerup="up" @pointerleave="up"></canvas>
        <canvas ref="mesh"></canvas>
      </div>
    </template>
    <template #result>
      <div>顶点 i 的 UV = ((u_i + offsetU) × tile, (v_i + offsetV) × tile)</div>
      <div>采样：纹理坐标超出 0~1 时，Wrap 会重复，Clamp 会夹到边缘。</div>
      <div style="color:var(--accent)">当前 4 个角 UV：{{ uvText }}</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'

export default {
  components: { DemoShell },
  data() {
    return {
      ou: 0,
      ov: 0,
      tile: 1,
      uvPts: [
        { u: 0, v: 0 },
        { u: 1, v: 0 },
        { u: 1, v: 1 },
        { u: 0, v: 1 }
      ],
      drag: -1
    }
  },
  computed: {
    uvText() {
      return this.uvPts
        .map((p) => `(${(p.u * this.tile + this.ou).toFixed(2)}, ${(p.v * this.tile + this.ov).toFixed(2)})`)
        .join('  ')
    }
  },
  watch: {
    ou() { this.draw() },
    ov() { this.draw() },
    tile() { this.draw() },
    uvPts: { deep: true, handler() { this.draw() } }
  },
  mounted() {
    this.ro = new ResizeObserver(() => this.draw())
    this.ro.observe(this.$el)
    this.draw()
  },
  beforeUnmount() { this.ro && this.ro.disconnect() },
  methods: {
    reset() {
      this.ou = 0; this.ov = 0; this.tile = 1
      this.uvPts = [{ u: 0, v: 0 }, { u: 1, v: 0 }, { u: 1, v: 1 }, { u: 0, v: 1 }]
    },
    texColor(u, v) {
      const uu = ((u * this.tile + this.ou) % 1 + 1) % 1
      const vv = ((v * this.tile + this.ov) % 1 + 1) % 1
      const cx = Math.floor(uu * 8)
      const cy = Math.floor(vv * 8)
      const checker = (cx + cy) % 2 === 0
      const r = checker ? 79 : 124
      const g = checker ? 209 : 156
      const b = checker ? 197 : 255
      return [r, g, b]
    },
    draw() {
      this.drawUV()
      this.drawMesh()
    },
    drawUV() {
      const cv = this.$refs.uv
      if (!cv) return
      const w = cv.parentElement.clientWidth / 2
      const h = Math.max(cv.parentElement.clientHeight, 280)
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
      const s = Math.min(w, h) - pad * 2
      const ox = (w - s) / 2
      const oy = (h - s) / 2
      const sw = Math.max(1, Math.floor(s * dpr))
      const img = ctx.createImageData(sw, sw)
      for (let y = 0; y < sw; y++) {
        for (let x = 0; x < sw; x++) {
          const u = x / (sw - 1)
          const v = 1 - y / (sw - 1)
          const [r, g, b] = this.texColor(u, v)
          const i = (y * sw + x) * 4
          img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.putImageData(img, ox * dpr, oy * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.strokeStyle = '#eceef2'
      ctx.strokeRect(ox, oy, s, s)
      this.uvMap = { ox, oy, s, w, h }
      ctx.font = '12px IBM Plex Sans, sans-serif'
      ctx.fillStyle = '#8b93a7'
      ctx.fillText('UV 空间', 12, 20)
      this.uvPts.forEach((p, i) => {
        const x = ox + p.u * s
        const y = oy + (1 - p.v) * s
        ctx.beginPath()
        ctx.arc(x, y, 7, 0, Math.PI * 2)
        ctx.fillStyle = '#e0af68'
        ctx.fill()
        ctx.fillStyle = '#e0af68'
        ctx.fillText('v' + i, x + 8, y - 8)
      })
    },
    drawMesh() {
      const cv = this.$refs.mesh
      if (!cv) return
      const w = cv.parentElement.clientWidth / 2
      const h = Math.max(cv.parentElement.clientHeight, 280)
      const dpr = Math.min(devicePixelRatio || 1, 2)
      cv.width = w * dpr
      cv.height = h * dpr
      cv.style.width = w + 'px'
      cv.style.height = h + 'px'
      const ctx = cv.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#0c0e12'
      ctx.fillRect(0, 0, w, h)
      const pad = 40
      const s = Math.min(w, h) - pad * 2
      const ox = (w - s) / 2
      const oy = (h - s) / 2
      const sw = Math.max(1, Math.floor(s * dpr))
      const img = ctx.createImageData(sw, sw)
      const pts = this.uvPts
      for (let y = 0; y < sw; y++) {
        for (let x = 0; x < sw; x++) {
          const fx = x / (sw - 1)
          const fy = y / (sw - 1)
          const u = (1 - fy) * ((1 - fx) * pts[0].u + fx * pts[1].u) + fy * ((1 - fx) * pts[3].u + fx * pts[2].u)
          const v = (1 - fy) * ((1 - fx) * pts[0].v + fx * pts[1].v) + fy * ((1 - fx) * pts[3].v + fx * pts[2].v)
          const [r, g, b] = this.texColor(u, v)
          const i = (y * sw + x) * 4
          img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.putImageData(img, ox * dpr, oy * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.strokeStyle = '#4fd1c5'
      ctx.strokeRect(ox, oy, s, s)
      ctx.fillStyle = '#8b93a7'
      ctx.font = '12px IBM Plex Sans, sans-serif'
      ctx.fillText('3D 平面（示意）', 12, 20)
    },
    local(e, cv) {
      const r = cv.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    },
    down(e) {
      const l = this.local(e, this.$refs.uv)
      const m = this.uvMap
      if (!m) return
      let best = -1, bd = 16
      this.uvPts.forEach((p, i) => {
        const x = m.ox + p.u * m.s
        const y = m.oy + (1 - p.v) * m.s
        const d = Math.hypot(x - l.x, y - l.y)
        if (d < bd) { bd = d; best = i }
      })
      this.drag = best
      this.$refs.uv.setPointerCapture(e.pointerId)
    },
    move(e) {
      if (this.drag < 0 || !this.uvMap) return
      const l = this.local(e, this.$refs.uv)
      const m = this.uvMap
      const u = Math.min(1, Math.max(0, (l.x - m.ox) / m.s))
      const v = Math.min(1, Math.max(0, 1 - (l.y - m.oy) / m.s))
      this.uvPts[this.drag] = { u: Math.round(u * 100) / 100, v: Math.round(v * 100) / 100 }
    },
    up() { this.drag = -1 }
  }
}
</script>

<style scoped>
.split { display: flex; width: 100%; height: 100%; min-height: 340px; }
canvas { flex: 1; display: block; cursor: grab; touch-action: none; }
</style>
