<template>
  <article class="article">
    <p class="chip">02 图形学基础</p>
    <h1>颜色、Gamma 与线性空间</h1>
    <p class="lead">显示器不是线性的：中间灰并不对应一半能量。光照却是线性物理。两者没对齐，场景就会发灰、金属变塑料。</p>

    <FormulaBlock
      latex="I_{\text{display}} \approx V^{\gamma},\quad \gamma \approx 2.2"
      :symbols="[
        { s: 'I_{\\text{display}}', d: '屏幕发出的光强度（人眼看到的亮）' },
        { s: 'V', d: '帧缓冲里 0~1 的电压/编码值' },
        { s: '\\gamma', d: 'Gamma，sRGB 大约 2.2' }
      ]"
    />
    <ColorGammaDemo />

    <h2>工作里怎么设</h2>
    <ol class="steps">
      <li>项目 Color Space 用 Linear。</li>
      <li>反照率、自发光贴图勾选 sRGB；法线、粗糙度、金属度、Mask <strong>不要</strong> sRGB。</li>
      <li>Shader 里采样 albedo 后在线性空间做光照，最后交给管线做 ToneMapping 和回 sRGB。</li>
    </ol>
    <div class="callout">HDR 是「颜色可以大于 1」。Bloom、曝光、ACES 都假设你在线性 HDR 里工作。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="color" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import ColorGammaDemo from '../demos/ColorGammaDemo.vue'

export default {
  components: { FormulaBlock, SourceLinks, NextPrev, ColorGammaDemo },
  data() {
    return {
      sources: [
        { title: 'GPU Gems 3 — The Importance of Being Linear', url: 'https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-24-importance-being-linear' },
        { title: 'Unity 文档 Linear rendering', url: 'https://docs.unity3d.com/Manual/LinearRendering-LinearOrGammaWorkflow.html' }
      ]
    }
  }
}
</script>
