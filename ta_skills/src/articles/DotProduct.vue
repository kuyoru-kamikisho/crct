<template>
  <article class="article">
    <p class="chip">01 数学基础</p>
    <h1>点乘：夹角、投影与“有多同向”</h1>
    <p class="lead">点乘（点积）输出一个<strong>数</strong>。这个数同时告诉你：两个方向夹角多大、一个向量在另一个上的投影有多长。Lambert 光照的 N·L 就是它。</p>

    <h2>两种算法，一个结果</h2>
    <FormulaBlock
      latex="\vec{A}\cdot\vec{B} = A_x B_x + A_y B_y + A_z B_z = |\vec{A}|\,|\vec{B}|\,\cos\theta"
      :symbols="[
        { s: '\\vec{A}\\cdot\\vec{B}', d: '点乘结果，标量' },
        { s: 'A_x, A_y, A_z', d: 'A 的三个分量' },
        { s: 'B_x, B_y, B_z', d: 'B 的三个分量' },
        { s: '|\\vec{A}|, |\\vec{B}|', d: '两向量的长度' },
        { s: '\\theta', d: '两向量之间的夹角' },
        { s: '\\cos\\theta', d: '夹角的余弦：0° 时为 1，90° 时为 0，180° 时为 −1' }
      ]"
    />
    <p>分量相乘再相加，适合代码；模乘余弦，适合直觉。演示器里两种算法会给出同一个数，用来互相验算。</p>
    <DotProductDemo />

    <h2>在 TA 工作里它出现在哪</h2>
    <ul>
      <li><strong>光照：</strong>N·L ≤ 0 表示表面背对灯光，漫反射为 0。</li>
      <li><strong>投影：</strong>把速度、位移拆到地面或法线方向（滑墙、贴地）。</li>
      <li><strong>判断朝向：</strong>相机前向 · (物体位置 − 相机位置) 可做简单视野检测。</li>
    </ul>
    <CodeBlock lang="hlsl" :code="code" />
    <div class="callout">点乘与顺序无关：A·B = B·A。它不给你「朝左还是朝右」，那是叉乘的事。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="dot-product" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import CodeBlock from '../components/CodeBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import DotProductDemo from '../demos/DotProductDemo.vue'

export default {
  components: { FormulaBlock, CodeBlock, SourceLinks, NextPrev, DotProductDemo },
  data() {
    return {
      code: `float NdotL = saturate(dot(N, L));
float3 diffuse = albedo * lightColor * NdotL;`,
      sources: [
        { title: '3Blue1Brown — 点积的几何意义', url: 'https://www.youtube.com/watch?v=LyGKycYT2v0' },
        { title: 'LearnOpenGL — Basic Lighting', url: 'https://learnopengl.com/Lighting/Basic-Lighting' }
      ]
    }
  }
}
</script>
