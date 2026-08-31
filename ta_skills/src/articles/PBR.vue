<template>
  <article class="article">
    <p class="chip">03 光照与着色</p>
    <h1>PBR 直觉：金属、粗糙度、能量守恒</h1>
    <p class="lead">先不要背完整 Disney BRDF。记住三个旋钮：反照率是「固有色」，金属度决定有没有漫反射，粗糙度决定高光是镜面还是雾状。演示器是简化模型，用来建立手感。</p>

    <FormulaBlock
      latex="F_0 = \operatorname{lerp}(0.04,\; C_{\text{albedo}},\; m),\quad C_{\text{diff}} = C_{\text{albedo}}(1-m)"
      :symbols="[
        { s: 'F_0', d: '0° 入射时的镜面反射率（菲涅尔基底）' },
        { s: '0.04', d: '大多数非金属的经验值，约 4%' },
        { s: 'C_{\\text{albedo}}', d: '反照率颜色' },
        { s: 'm', d: '金属度 metallic，0 非金属，1 金属' },
        { s: 'C_{\\text{diff}}', d: '漫反射颜色；金属时为 0' }
      ]"
    />
    <PBRDemo />

    <h2>和美术对词</h2>
    <ul>
      <li>粗糙度 ↑：高光变大变糊，环境反射发雾。</li>
      <li>金属度 ↑：漫反射消失，高光带上反照率的颜色（金子偏黄）。</li>
      <li>不要把高光画进反照率里，那是「脏 PBR」，换光照就穿帮。</li>
    </ul>
    <div class="callout">完整实现还有 GGX 分布、几何遮挡、分片菲涅尔、IBL。求职作品里能讲清「为什么这套贴图在点光和环境光下都成立」比抄公式加分。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="pbr" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import PBRDemo from '../demos/PBRDemo.vue'

export default {
  components: { FormulaBlock, SourceLinks, NextPrev, PBRDemo },
  data() {
    return {
      sources: [
        { title: 'LearnOpenGL — PBR Theory', url: 'https://learnopengl.com/PBR/Theory' },
        { title: 'Filament 文档 PBR', url: 'https://google.github.io/filament/Filament.html' }
      ]
    }
  }
}
</script>
