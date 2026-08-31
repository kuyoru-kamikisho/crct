<template>
  <DemoShell title="渲染管线演示器" :onReset="reset">
    <template #params>
      <div class="field">
        <label>播放速度 <span class="val">{{ speed }}x</span></label>
        <input type="range" min="0.3" max="2.5" step="0.1" v-model.number="speed" />
      </div>
      <button class="btn btn-accent" @click="paused = !paused">{{ paused ? '继续' : '暂停' }}</button>
      <p class="hint">一个三角形从 CPU 出发，经过各阶段变成像素。高亮阶段即当前步骤。</p>
    </template>
    <template #stage>
      <div class="pipe">
        <div
          v-for="(st, i) in stages"
          :key="st.id"
          class="st"
          :class="{ on: i === cur }"
        >
          <i class="mdi" :class="st.icon"></i>
          <b>{{ st.name }}</b>
          <span>{{ st.where }}</span>
        </div>
      </div>
    </template>
    <template #result>
      <div style="color:var(--accent)">当前：{{ stages[cur].name }}（{{ stages[cur].where }}）</div>
      <div>{{ stages[cur].detail }}</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'

const stages = [
  { id: 'cpu', name: '提交 Draw', where: 'CPU', icon: 'mdi-memory', detail: '准备网格、材质常量、发出 Draw Call。数量多时 CPU 先卡。' },
  { id: 'vs', name: '顶点着色', where: 'GPU', icon: 'mdi-vector-triangle', detail: '每个顶点跑 Vertex Shader：乘 MVP，输出裁剪空间坐标和 varying。' },
  { id: 'ia', name: '图元装配', where: 'GPU', icon: 'mdi-triangle-outline', detail: '按索引把顶点连成三角形，做背面剔除与裁剪。' },
  { id: 'rs', name: '光栅化', where: 'GPU', icon: 'mdi-grid', detail: '三角形覆盖哪些像素？生成片元，并插值 UV、法线。' },
  { id: 'fs', name: '片元着色', where: 'GPU', icon: 'mdi-palette-outline', detail: 'Fragment Shader 算每个像素颜色：采样纹理、光照、PBR。' },
  { id: 'om', name: '测试与混合', where: 'GPU', icon: 'mdi-layers-outline', detail: '深度/模板测试，通过则写入颜色缓冲，半透明在此 Blend。' }
]

export default {
  components: { DemoShell },
  data() {
    return { stages, cur: 0, speed: 1, paused: false }
  },
  mounted() {
    this.t = 0
    this.loop()
  },
  beforeUnmount() {
    this.dead = true
  },
  methods: {
    reset() { this.cur = 0; this.speed = 1; this.paused = false },
    loop() {
      if (this.dead) return
      requestAnimationFrame(this.loop)
      if (this.paused) return
      this.t += 0.016 * this.speed
      if (this.t > 1.1) {
        this.t = 0
        this.cur = (this.cur + 1) % this.stages.length
      }
    }
  }
}
</script>

<style scoped>
.pipe {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 36px 16px 16px;
  height: 100%;
}
.st {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  background: #10141b;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 110px;
  transition: border-color 0.2s, background 0.2s;
}
.st i { font-size: 22px; color: var(--text-muted); }
.st b { font-size: 14px; }
.st span { font-size: 11px; color: var(--text-dim); font-family: var(--mono); }
.st.on {
  border-color: var(--accent-dim);
  background: var(--accent-soft);
}
.st.on i { color: var(--accent); }
</style>
