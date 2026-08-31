<template>
  <article class="article">
    <p class="chip">02 图形学基础</p>
    <h1>渲染管线一览</h1>
    <p class="lead">画面不是「引擎变出来的」，而是成千上万次 Draw Call 把顶点送进 GPU，一步步变成像素。TA 优化和写 Shader，都是在这条流水线上找位置。</p>

    <PipelineDemo />

    <h2>和前端类比（帮助转行）</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>网页</th><th>实时渲染</th></tr></thead>
        <tbody>
          <tr><td>DOM 节点</td><td>Mesh / 材质实例</td></tr>
          <tr><td>layout / paint</td><td>Cull + Draw Call</td></tr>
          <tr><td>CSS 计算样式</td><td>Shader 变体 / Keyword</td></tr>
          <tr><td>合成层过多</td><td>Overdraw / 半透明</td></tr>
          <tr><td>打包 tree-shaking</td><td>Shader stripping</td></tr>
        </tbody>
      </table>
    </div>
    <p>CPU 提交太勤会卡在主线程；片元太肥、分辨率太高会卡在 GPU。Profiler 里先分清 Bound 在哪一边，再动手。</p>
    <div class="callout blue">Draw Call 本身不一定贵，贵的是中间的状态切换（换 Shader、换贴图）。所以「同材质尽量一起画」。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="pipeline" />
  </article>
</template>

<script>
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import PipelineDemo from '../demos/PipelineDemo.vue'

export default {
  components: { SourceLinks, NextPrev, PipelineDemo },
  data() {
    return {
      sources: [
        { title: 'LearnOpenGL — Hello Triangle / Pipeline', url: 'https://learnopengl.com/Getting-started/Hello-Triangle' },
        { title: 'Unity 文档 Rendering Pipeline', url: 'https://docs.unity3d.com/Manual/render-pipelines.html' }
      ]
    }
  }
}
</script>
