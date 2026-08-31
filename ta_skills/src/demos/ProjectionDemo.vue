<template>
  <DemoShell title="透视投影演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>FOV <span class="val">{{ fov }}°</span></label>
        <input type="range" min="20" max="90" step="1" v-model.number="fov" />
      </div>
      <div class="field">
        <label>相机距离 <span class="val">{{ dist }}</span></label>
        <input type="range" min="2" max="10" step="0.1" v-model.number="dist" />
      </div>
      <div class="field">
        <label>近裁剪面 <span class="val">{{ near }}</span></label>
        <input type="range" min="0.1" max="2" step="0.05" v-model.number="near" />
      </div>
      <label class="chk"><input type="checkbox" v-model="ortho" /> 正交投影（无近大远小）</label>
    </template>
    <template #stage>
      <div ref="host" class="host"></div>
    </template>
    <template #result>
      <div v-if="!ortho">透视：同样大小的两个立方体，近处在屏幕上更大。FOV 越大，同一物体显得越小、视野越广。</div>
      <div v-else>正交：平行投影，物体大小与距离无关，适合 2D / 建筑图纸 / 阴影贴图。</div>
      <div>透视除法后：x' = x / w，w 随深度变大，所以远的东西 xy 被缩小。</div>
      <div style="color:var(--accent)">当前 FOV={{ fov }}°，距离={{ fmt(dist) }}，near={{ fmt(near) }} {{ near < 0.2 ? '（near 过小会浪费深度精度，容易 Z-Fighting）' : '' }}</div>
    </template>
  </DemoShell>
</template>

<script>
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import DemoShell from '../components/DemoShell.vue'
import { fmt } from '../utils/math.js'

export default {
  components: { DemoShell },
  data() {
    return { fov: 50, dist: 6, near: 0.3, ortho: false }
  },
  watch: {
    fov() { this.applyCam() },
    dist() { this.applyCam() },
    near() { this.applyCam() },
    ortho() { this.applyCam() }
  },
  mounted() {
    const host = this.$refs.host
    const canvas = document.createElement('canvas')
    host.appendChild(canvas)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    renderer.setClearColor(0x0c0e12, 1)
    const scene = new THREE.Scene()
    this.persp = new THREE.PerspectiveCamera(this.fov, 1, this.near, 40)
    this.orth = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 40)
    scene.add(new THREE.GridHelper(10, 10, 0x3a4458, 0x1c2230))
    scene.add(new THREE.AmbientLight(0xffffff, 0.45))
    const L = new THREE.DirectionalLight(0xffffff, 1)
    L.position.set(3, 5, 4)
    scene.add(L)
    const colors = [0x4fd1c5, 0x7c9cff, 0xe0af68]
    ;[-2.2, 0, 2.2].forEach((z, i) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.4 })
      )
      m.position.set(0, 0.5, z)
      scene.add(m)
    })
    this.camera = this.persp
    const controls = new OrbitControls(this.camera, canvas)
    controls.enableDamping = true
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    }
    this.renderer = renderer
    this.scene = scene
    this.controls = controls
    this.canvas = canvas
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
    this.resize()
    this.applyCam()
    this.loop()
  },
  beforeUnmount() {
    this.dead = true
    this.ro && this.ro.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
  },
  methods: {
    fmt,
    reset() { this.fov = 50; this.dist = 6; this.near = 0.3; this.ortho = false },
    applyCam() {
      if (!this.persp) return
      this.persp.fov = this.fov
      this.persp.near = this.near
      this.persp.position.set(0, 1.6, this.dist)
      this.orth.position.set(0, 1.6, this.dist)
      this.orth.near = this.near
      this.camera = this.ortho ? this.orth : this.persp
      this.camera.lookAt(0, 0.5, 0)
      this.controls.object = this.camera
      this.camera.updateProjectionMatrix()
      this.resize()
    },
    resize() {
      if (!this.renderer) return
      const w = this.$refs.host.clientWidth
      const h = Math.max(this.$refs.host.clientHeight, 280)
      this.renderer.setSize(w, h, false)
      const a = w / h
      this.persp.aspect = a
      this.persp.updateProjectionMatrix()
      const hh = 3
      this.orth.left = -hh * a
      this.orth.right = hh * a
      this.orth.top = hh
      this.orth.bottom = -hh
      this.orth.updateProjectionMatrix()
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
.chk { display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-muted); margin-top: 8px; }
</style>
