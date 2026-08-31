<template>
  <DemoShell title="3D 变换演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>绕 Y 旋转 <span class="val">{{ ry }}°</span></label>
        <input type="range" min="-180" max="180" step="1" v-model.number="ry" />
      </div>
      <div class="field">
        <label>绕 X 旋转 <span class="val">{{ rx }}°</span></label>
        <input type="range" min="-180" max="180" step="1" v-model.number="rx" />
      </div>
      <div class="field">
        <label>缩放 <span class="val">{{ sc }}</span></label>
        <input type="range" min="0.3" max="2" step="0.05" v-model.number="sc" />
      </div>
      <div class="field">
        <label>平移 Y <span class="val">{{ ty }}</span></label>
        <input type="range" min="-2" max="2" step="0.05" v-model.number="ty" />
      </div>
    </template>
    <template #stage>
      <div ref="host" class="host"></div>
    </template>
    <template #result>
      <div>局部顶点 v = (x, y, z, 1)　← 第四个 1 就是齐次坐标，用来装平移</div>
      <div>世界坐标 = T · Rx · Ry · S · v</div>
      <div>若不用 4D，3×3 矩阵乘不出平移（平移不是线性变换）。</div>
      <div style="color:var(--accent)">当前：S={{ fmt(sc) }}，Rx={{ rx }}°，Ry={{ ry }}°，T.y={{ fmt(ty) }}</div>
    </template>
  </DemoShell>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import DemoShell from '../components/DemoShell.vue'
import { fmt, rad } from '../utils/math.js'

export default {
  components: { DemoShell },
  data() {
    return { ry: 30, rx: -18, sc: 1, ty: 0 }
  },
  watch: {
    ry() { this.apply() },
    rx() { this.apply() },
    sc() { this.apply() },
    ty() { this.apply() }
  },
  mounted() {
    const host = this.$refs.host
    const canvas = document.createElement('canvas')
    host.appendChild(canvas)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    renderer.setClearColor(0x0c0e12, 1)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80)
    camera.position.set(4, 3, 5)
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    }
    scene.add(new THREE.GridHelper(8, 8, 0x3a4458, 0x1c2230))
    scene.add(new THREE.AxesHelper(2))
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const light = new THREE.DirectionalLight(0xffffff, 0.9)
    light.position.set(4, 6, 3)
    scene.add(light)

    const geo = new THREE.BoxGeometry(1, 1, 1)
    const mat = new THREE.MeshStandardMaterial({ color: 0x4fd1c5, metalness: 0.1, roughness: 0.45 })
    this.mesh = new THREE.Mesh(geo, mat)
    scene.add(this.mesh)
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xeceef2 })
    )
    this.mesh.add(wire)

    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.controls = controls
    this.canvas = canvas
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
    this.resize()
    this.apply()
    this.loop()
  },
  beforeUnmount() {
    this.dead = true
    this.ro && this.ro.disconnect()
    this.controls && this.controls.dispose()
    this.renderer && this.renderer.dispose()
  },
  methods: {
    fmt,
    reset() { this.ry = 30; this.rx = -18; this.sc = 1; this.ty = 0 },
    apply() {
      if (!this.mesh) return
      this.mesh.scale.setScalar(this.sc)
      this.mesh.rotation.set(rad(this.rx), rad(this.ry), 0)
      this.mesh.position.set(0, this.ty, 0)
    },
    resize() {
      const w = this.$refs.host.clientWidth
      const h = Math.max(this.$refs.host.clientHeight, 280)
      this.renderer.setSize(w, h, false)
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    },
    loop() {
      if (this.dead) return
      requestAnimationFrame(this.loop)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
  }
}
</script>

<style scoped>
.host { width: 100%; height: 100%; min-height: 340px; }
.host :deep(canvas) { display: block; width: 100%; height: 100%; }
</style>
