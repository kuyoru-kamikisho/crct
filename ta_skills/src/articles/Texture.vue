<template>
  <article class="article">
    <p class="chip">03 光照与着色</p>
    <h1>UV、纹理采样与法线贴图</h1>
    <p class="lead">网格是 3D 的，图片是 2D 的。UV 给每个顶点一对 (u, v)，光栅化时在三角形内部插值，再去纹理上取样。法线贴图则用这张图去「拧」光照用的法线。</p>

    <FormulaBlock
      latex="\text{color} = \text{tex2D}(u, v),\quad u,v \in [0,1]"
      :symbols="[
        { s: 'u', d: '横向纹理坐标，0 左 1 右（Wrap 时会重复）' },
        { s: 'v', d: '纵向纹理坐标，注意引擎与 DCC 的 V 是否翻转' },
        { s: 'tex2D', d: '按过滤模式（点/双线性/三线性）采样' }
      ]"
    />
    <UVDemo />

    <h2>法线贴图为什么在切线空间</h2>
    <p>贴图里 (128, 128, 255) 表示「相对表面朝外」。顶点带着切线 T、副切线 B、法线 N 组成 TBN。物体一旋转，TBN 跟着转，同一张贴图还能用。世界空间法线贴图做不到通用骨骼动画。</p>
    <FormulaBlock
      latex="N_{\text{world}} = TBN \cdot (2\cdot n_{\text{tex}} - 1)"
      :symbols="[
        { s: 'n_{\\text{tex}}', d: '法线贴图 RGB，通常已是 0~1' },
        { s: '2n-1', d: '还原到 [-1,1] 的切线空间法线' },
        { s: 'TBN', d: '以切线、副切线、法线为列（或行）的 3×3 基' },
        { s: 'N_{\\text{world}}', d: '世界空间法线，拿去和灯光做点乘' }
      ]"
    />
    <div class="callout warn">DCC 与引擎必须统一 MikkTSpace，否则会出现接缝亮线。数据贴图关闭 sRGB。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="texture" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import UVDemo from '../demos/UVDemo.vue'

export default {
  components: { FormulaBlock, SourceLinks, NextPrev, UVDemo },
  data() {
    return {
      sources: [
        { title: 'LearnOpenGL — Textures', url: 'https://learnopengl.com/Getting-started/Textures' },
        { title: 'LearnOpenGL — Normal Mapping', url: 'https://learnopengl.com/Advanced-Lighting/Normal-Mapping' }
      ]
    }
  }
}
</script>
