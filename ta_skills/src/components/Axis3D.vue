<template>
  <div class="wrap">
    <canvas ref="cv"></canvas>
    <div class="hint">右键拖动旋转视角 · 滚轮缩放</div>
    <div class="labels">
      <div
        v-for="lb in labels"
        :key="lb.id"
        class="lb"
        :style="{ left: lb.x + 'px', top: lb.y + 'px', color: lb.color }"
      >
        {{ lb.text }}
      </div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default {
  props: {
    vectors: { type: Array, default: () => [] },
    points: { type: Array, default: () => [] },
    extras: { type: Function, default: null }
  },
  data() {
    return { labels: [] }
  },
  watch: {
    vectors: { deep: true, handler() { this.rebuild() } },
    points: { deep: true, handler() { this.rebuild() } }
  },
  mounted() {
    const canvas = this.$refs.cv
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x0c0e12, 1)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80)
    camera.position.set(4.2, 3.2, 5.2)

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    }
    controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_ROTATE
    }

    const grid = new THREE.GridHelper(8, 8, 0x3a4458, 0x1c2230)
    scene.add(grid)
    scene.add(new THREE.AxesHelper(2.2))
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(3, 5, 2)
    scene.add(dir)

    this.group = new THREE.Group()
    scene.add(this.group)

    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.controls = controls

    if (this.extras) this.extras(scene, this)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(this.$el)
    this.resize()
    this.rebuild()
    this.loop()
  },
  beforeUnmount() {
    this.dead = true
    this.ro && this.ro.disconnect()
    this.controls && this.controls.dispose()
    this.renderer && this.renderer.dispose()
  },
  methods: {
    resize() {
      const w = this.$el.clientWidth
      const h = Math.max(this.$el.clientHeight, 280)
      this.renderer.setSize(w, h, false)
      this.camera.aspect = w / Math.max(h, 1)
      this.camera.updateProjectionMatrix()
    },
    rebuild() {
      if (!this.group) return
      while (this.group.children.length) {
        const c = this.group.children[0]
        this.group.remove(c)
        c.geometry && c.geometry.dispose()
        c.material && c.material.dispose && c.material.dispose()
      }
      this.labelDefs = []
      for (const v of this.vectors) {
        const origin = new THREE.Vector3(...(v.origin || [0, 0, 0]))
        const dir = new THREE.Vector3(...v.dir)
        const len = dir.length() || 0.001
        const arrow = new THREE.ArrowHelper(dir.clone().normalize(), origin, len, v.color || 0x4fd1c5, 0.18, 0.1)
        this.group.add(arrow)
        if (v.label) {
          this.labelDefs.push({
            id: v.label + len,
            text: v.label,
            color: '#' + (v.color || 0x4fd1c5).toString(16).padStart(6, '0'),
            pos: origin.clone().add(dir)
          })
        }
      }
      for (const p of this.points) {
        const g = new THREE.SphereGeometry(0.08, 16, 16)
        const m = new THREE.MeshBasicMaterial({ color: p.color || 0x4fd1c5 })
        const mesh = new THREE.Mesh(g, m)
        mesh.position.set(...p.pos)
        this.group.add(mesh)
        if (p.label) {
          this.labelDefs.push({
            id: p.label,
            text: p.label,
            color: '#4fd1c5',
            pos: new THREE.Vector3(...p.pos)
          })
        }
      }
    },
    loop() {
      if (this.dead) return
      requestAnimationFrame(this.loop)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
      this.updateLabels()
    },
    updateLabels() {
      if (!this.labelDefs) return
      const w = this.$el.clientWidth
      const h = this.$el.clientHeight
      this.labels = this.labelDefs.map((d) => {
        const v = d.pos.clone().project(this.camera)
        return {
          id: d.id,
          text: d.text,
          color: d.color,
          x: (v.x * 0.5 + 0.5) * w,
          y: (-v.y * 0.5 + 0.5) * h
        }
      })
    }
  }
}
</script>

<style scoped>
.wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 340px;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.hint {
  position: absolute;
  right: 10px;
  bottom: 8px;
  font-size: 11px;
  color: var(--text-dim);
  pointer-events: none;
}
.labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.lb {
  position: absolute;
  transform: translate(8px, -8px);
  font-size: 12px;
  font-family: var(--mono);
  text-shadow: 0 1px 2px #000;
}
</style>
