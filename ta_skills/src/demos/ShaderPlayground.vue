<template>
  <DemoShell title="片元着色器演练场" :onReset="reset">
    <template #params>
      <label class="mini">预设</label>
      <select v-model="preset" @change="applyPreset">
        <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <p class="hint">改左边 GLSL，松开会重新编译。语法错会显示在结果区。</p>
    </template>
    <template #stage>
      <div class="split">
        <textarea v-model="src" spellcheck="false" @blur="compile"></textarea>
        <canvas ref="cv"></canvas>
      </div>
    </template>
    <template #result>
      <div v-if="err" style="color:var(--danger)">编译错误：{{ err }}</div>
      <div v-else style="color:var(--ok)">编译成功。u_time / u_res 已传入。这就是片元着色器：对每个像素跑一遍 main()。</div>
    </template>
  </DemoShell>
</template>

<script>
import DemoShell from '../components/DemoShell.vue'

const VS = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const presets = [
  {
    id: 'uv',
    name: 'UV 渐变',
    src: `precision mediump float;
uniform vec2 u_res;
uniform float u_time;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  gl_FragColor = vec4(uv, 0.5 + 0.5 * sin(u_time), 1.0);
}`
  },
  {
    id: 'circle',
    name: '圆与平滑边',
    src: `precision mediump float;
uniform vec2 u_res;
uniform float u_time;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float d = length(uv) - 0.35;
  float c = 1.0 - smoothstep(0.0, 0.01, d);
  vec3 col = mix(vec3(0.05), vec3(0.3, 0.85, 0.78), c);
  gl_FragColor = vec4(col, 1.0);
}`
  },
  {
    id: 'light',
    name: '简易球面光照',
    src: `precision mediump float;
uniform vec2 u_res;
uniform float u_time;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float r2 = dot(uv, uv);
  if (r2 > 1.0) { gl_FragColor = vec4(0.05, 0.06, 0.08, 1.0); return; }
  vec3 N = vec3(uv, sqrt(1.0 - r2));
  vec3 L = normalize(vec3(sin(u_time), 0.6, cos(u_time)));
  float diff = max(dot(N, L), 0.0);
  gl_FragColor = vec4(vec3(0.2, 0.7, 0.65) * (0.1 + 0.9 * diff), 1.0);
}`
  }
]

export default {
  components: { DemoShell },
  data() {
    return {
      presets,
      preset: 'uv',
      src: presets[0].src,
      err: '',
      gl: null,
      prog: null,
      t0: 0
    }
  },
  mounted() {
    const cv = this.$refs.cv
    this.gl = cv.getContext('webgl')
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(cv.parentElement)
    this.resize()
    this.compile()
    this.t0 = performance.now()
    this.loop()
  },
  beforeUnmount() {
    this.dead = true
    this.ro && this.ro.disconnect()
  },
  methods: {
    reset() {
      this.preset = 'uv'
      this.applyPreset()
    },
    applyPreset() {
      const p = this.presets.find((x) => x.id === this.preset)
      this.src = p.src
      this.$nextTick(this.compile)
    },
    resize() {
      const cv = this.$refs.cv
      const box = cv.parentElement
      const w = Math.max(120, Math.floor(box.clientWidth / 2))
      const h = Math.max(box.clientHeight, 280)
      const dpr = Math.min(devicePixelRatio || 1, 2)
      cv.width = w * dpr
      cv.height = h * dpr
      cv.style.width = w + 'px'
      cv.style.height = h + 'px'
      if (this.gl) this.gl.viewport(0, 0, cv.width, cv.height)
    },
    compile() {
      const gl = this.gl
      if (!gl) return
      const vs = this.mk(gl.VERTEX_SHADER, VS)
      const fs = this.mk(gl.FRAGMENT_SHADER, this.src)
      if (!vs || !fs) return
      const p = gl.createProgram()
      gl.attachShader(p, vs)
      gl.attachShader(p, fs)
      gl.bindAttribLocation(p, 0, 'a_pos')
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        this.err = gl.getProgramInfoLog(p) || 'link failed'
        return
      }
      this.err = ''
      this.prog = p
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
      this.buf = buf
    },
    mk(type, src) {
      const gl = this.gl
      const sh = gl.createShader(type)
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        this.err = gl.getShaderInfoLog(sh) || 'compile failed'
        return null
      }
      return sh
    },
    loop() {
      if (this.dead) return
      requestAnimationFrame(this.loop)
      const gl = this.gl
      const p = this.prog
      if (!gl || !p) return
      gl.useProgram(p)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buf)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      const res = gl.getUniformLocation(p, 'u_res')
      const time = gl.getUniformLocation(p, 'u_time')
      gl.uniform2f(res, this.$refs.cv.width, this.$refs.cv.height)
      gl.uniform1f(time, (performance.now() - this.t0) / 1000)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
  }
}
</script>

<style scoped>
.split { display: flex; width: 100%; height: 100%; min-height: 340px; }
textarea {
  flex: 1;
  min-width: 0;
  border: none;
  border-right: 1px solid var(--border);
  background: #0d1117;
  color: #c8cdd8;
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.5;
  padding: 28px 10px 10px;
  resize: none;
  outline: none;
}
canvas { flex: 1; display: block; min-width: 0; }
.mini { font-size: 12px; color: var(--text-muted); display: block; margin-bottom: 4px; }
select {
  width: 100%;
  height: 28px;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
</style>
