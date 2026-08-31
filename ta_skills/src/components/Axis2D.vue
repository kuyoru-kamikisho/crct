<template>
  <canvas
    ref="cv"
    class="cv"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointerleave="onUp"
  ></canvas>
</template>

<script>
import { clamp } from '../utils/math.js'

export default {
  props: {
    range: { type: Number, default: 5 },
    points: { type: Array, default: () => [] },
    arrows: { type: Array, default: () => [] },
    extras: { type: Array, default: () => [] }
  },
  emits: ['update:points', 'change'],
  data() {
    return { dragId: null, dpr: 1, w: 1, h: 1 }
  },
  watch: {
    points: { deep: true, handler() { this.draw() } },
    arrows: { deep: true, handler() { this.draw() } },
    extras: { deep: true, handler() { this.draw() } }
  },
  mounted() {
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.$el.parentElement || this.$el)
    this.resize()
  },
  beforeUnmount() {
    this.ro && this.ro.disconnect()
  },
  methods: {
    resize() {
      const cv = this.$refs.cv
      if (!cv) return
      const parent = cv.parentElement
      const rect = parent.getBoundingClientRect()
      this.dpr = Math.min(window.devicePixelRatio || 1, 2)
      this.w = Math.max(100, rect.width)
      this.h = Math.max(280, rect.height)
      cv.width = this.w * this.dpr
      cv.height = this.h * this.dpr
      cv.style.width = this.w + 'px'
      cv.style.height = this.h + 'px'
      this.draw()
    },
    scale() {
      return (Math.min(this.w, this.h) - 48) / (2 * this.range)
    },
    origin() {
      return { x: this.w / 2, y: this.h / 2 }
    },
    toScreen(x, y) {
      const o = this.origin()
      const s = this.scale()
      return { x: o.x + x * s, y: o.y - y * s }
    },
    toWorld(sx, sy) {
      const o = this.origin()
      const s = this.scale()
      return { x: (sx - o.x) / s, y: (o.y - sy) / s }
    },
    local(e) {
      const r = this.$refs.cv.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    },
    hit(sx, sy) {
      for (let i = this.points.length - 1; i >= 0; i--) {
        const p = this.points[i]
        if (p.draggable === false) continue
        const s = this.toScreen(p.x, p.y)
        if (Math.hypot(s.x - sx, s.y - sy) < 14) return p.id
      }
      return null
    },
    onDown(e) {
      const l = this.local(e)
      const id = this.hit(l.x, l.y)
      if (!id) return
      this.dragId = id
      this.$refs.cv.setPointerCapture(e.pointerId)
      this.moveTo(l.x, l.y)
    },
    onMove(e) {
      if (!this.dragId) return
      const l = this.local(e)
      this.moveTo(l.x, l.y)
    },
    onUp() {
      this.dragId = null
    },
    moveTo(sx, sy) {
      const w = this.toWorld(sx, sy)
      const next = this.points.map((p) => {
        if (p.id !== this.dragId) return p
        return {
          ...p,
          x: clamp(Math.round(w.x * 10) / 10, -this.range, this.range),
          y: clamp(Math.round(w.y * 10) / 10, -this.range, this.range)
        }
      })
      this.$emit('update:points', next)
      this.$emit('change', next)
    },
    draw() {
      const cv = this.$refs.cv
      if (!cv) return
      const ctx = cv.getContext('2d')
      const dpr = this.dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, this.w, this.h)
      ctx.fillStyle = '#0c0e12'
      ctx.fillRect(0, 0, this.w, this.h)

      const o = this.origin()
      const s = this.scale()

      ctx.strokeStyle = '#1c2230'
      ctx.lineWidth = 1
      for (let i = -this.range; i <= this.range; i++) {
        const a = this.toScreen(i, -this.range)
        const b = this.toScreen(i, this.range)
        const c = this.toScreen(-this.range, i)
        const d = this.toScreen(this.range, i)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.moveTo(c.x, c.y)
        ctx.lineTo(d.x, d.y)
        ctx.stroke()
      }

      ctx.strokeStyle = '#3a4458'
      ctx.lineWidth = 1.25
      ctx.beginPath()
      ctx.moveTo(24, o.y)
      ctx.lineTo(this.w - 24, o.y)
      ctx.moveTo(o.x, 24)
      ctx.lineTo(o.x, this.h - 24)
      ctx.stroke()

      ctx.fillStyle = '#5c6578'
      ctx.font = '11px IBM Plex Mono, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('x', this.w - 18, o.y - 8)
      ctx.fillText('y', o.x + 12, 18)
      ctx.fillText('O', o.x - 12, o.y + 14)

      for (const ex of this.extras) this.drawExtra(ctx, ex)

      for (const ar of this.arrows) {
        const from = Array.isArray(ar.from) ? { x: ar.from[0], y: ar.from[1] } : this.pt(ar.from)
        const to = Array.isArray(ar.to) ? { x: ar.to[0], y: ar.to[1] } : this.pt(ar.to)
        if (!from || !to) continue
        this.arrow(ctx, from, to, ar.color || '#7c9cff', ar.dashed)
        if (ar.label) {
          const mid = this.toScreen((from.x + to.x) / 2, (from.y + to.y) / 2)
          ctx.fillStyle = ar.color || '#7c9cff'
          ctx.font = '12px IBM Plex Sans, sans-serif'
          ctx.fillText(ar.label, mid.x + 8, mid.y - 8)
        }
      }

      for (const p of this.points) {
        const sp = this.toScreen(p.x, p.y)
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2)
        ctx.fillStyle = p.color || '#4fd1c5'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = '#0c0e12'
        ctx.stroke()
        ctx.fillStyle = p.color || '#4fd1c5'
        ctx.font = '12px IBM Plex Sans, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`${p.label || p.id} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`, sp.x + 10, sp.y - 10)
      }

      ctx.fillStyle = '#5c6578'
      ctx.font = '11px IBM Plex Sans, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('拖动彩色圆点可改坐标', 12, this.h - 12)
      void s
    },
    pt(id) {
      if (id === 'O') return { x: 0, y: 0 }
      return this.points.find((p) => p.id === id)
    },
    arrow(ctx, from, to, color, dashed) {
      const a = this.toScreen(from.x, from.y)
      const b = this.toScreen(to.x, to.y)
      const ang = Math.atan2(b.y - a.y, b.x - a.x)
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash(dashed ? [5, 4] : [])
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.setLineDash([])
      const L = 10
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(b.x - L * Math.cos(ang - 0.4), b.y - L * Math.sin(ang - 0.4))
      ctx.lineTo(b.x - L * Math.cos(ang + 0.4), b.y - L * Math.sin(ang + 0.4))
      ctx.closePath()
      ctx.fill()
    },
    drawExtra(ctx, ex) {
      if (ex.type === 'arc') {
        const o = this.toScreen(0, 0)
        const a0 = -ex.from
        const a1 = -ex.to
        ctx.beginPath()
        ctx.strokeStyle = ex.color || '#e0af68'
        ctx.lineWidth = 1.5
        ctx.arc(o.x, o.y, (ex.radius || 1) * this.scale(), a0, a1, a1 < a0)
        ctx.stroke()
        if (ex.label) {
          const mid = (a0 + a1) / 2
          const r = (ex.radius || 1) * this.scale() + 10
          ctx.fillStyle = ex.color || '#e0af68'
          ctx.font = '12px IBM Plex Mono, monospace'
          ctx.fillText(ex.label, o.x + Math.cos(mid) * r, o.y + Math.sin(mid) * r)
        }
      }
      if (ex.type === 'poly') {
        ctx.beginPath()
        ex.points.forEach((p, i) => {
          const s = this.toScreen(p[0], p[1])
          if (i === 0) ctx.moveTo(s.x, s.y)
          else ctx.lineTo(s.x, s.y)
        })
        ctx.closePath()
        ctx.fillStyle = ex.fill || 'rgba(124,156,255,0.15)'
        ctx.strokeStyle = ex.stroke || '#7c9cff'
        ctx.fill()
        ctx.stroke()
      }
      if (ex.type === 'line') {
        this.arrow(ctx, { x: ex.from[0], y: ex.from[1] }, { x: ex.to[0], y: ex.to[1] }, ex.color || '#8b93a7', ex.dashed)
      }
    }
  }
}
</script>

<style scoped>
.cv {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}
.cv:active { cursor: grabbing; }
</style>
