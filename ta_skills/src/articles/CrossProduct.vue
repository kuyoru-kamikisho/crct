<template>
  <article class="article">
    <p class="chip">01 数学基础</p>
    <h1>叉乘：垂直方向与面积</h1>
    <p class="lead">叉乘输出一个<strong>向量</strong>，方向同时垂直于 A 和 B。三角形法线、切线空间的副切线、判断绕序，都靠它。</p>

    <FormulaBlock
      latex="\vec{A}\times\vec{B} = \begin{pmatrix} A_y B_z - A_z B_y \\ A_z B_x - A_x B_z \\ A_x B_y - A_y B_x \end{pmatrix}"
      :symbols="[
        { s: '\\vec{A}\\times\\vec{B}', d: '叉乘结果，仍是向量' },
        { s: 'A_x,A_y,A_z', d: 'A 的分量' },
        { s: 'B_x,B_y,B_z', d: 'B 的分量' }
      ]"
    />
    <FormulaBlock
      latex="|\vec{A}\times\vec{B}| = |\vec{A}|\,|\vec{B}|\,\sin\theta"
      :symbols="[
        { s: '|\\vec{A}\\times\\vec{B}|', d: '结果向量的长度，等于以 A、B 为邻边的平行四边形面积' },
        { s: '\\theta', d: 'A 与 B 的夹角' },
        { s: '\\sin\\theta', d: '夹角的正弦：平行时为 0，垂直时为 1' }
      ]"
    />
    <p>方向用右手定则：四指从 A 握向 B，拇指指向叉乘。Unity 虽是左手世界，但 Vector3.Cross 的公式仍是上面这一套分量式，只要两边用同一套基就不会乱。</p>
    <CrossProductDemo />

    <h2>和点乘对比</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th></th><th>点乘</th><th>叉乘</th></tr></thead>
        <tbody>
          <tr><td>结果</td><td>标量</td><td>向量</td></tr>
          <tr><td>几何</td><td>夹角 / 投影</td><td>法线 / 面积</td></tr>
          <tr><td>顺序</td><td>可交换</td><td>A×B = −B×A</td></tr>
          <tr><td>平行时</td><td>最大或最小</td><td>结果为零向量</td></tr>
        </tbody>
      </table>
    </div>
    <CodeBlock lang="hlsl" :code="code" />

    <SourceLinks :items="sources" />
    <NextPrev slug="cross-product" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import CodeBlock from '../components/CodeBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import CrossProductDemo from '../demos/CrossProductDemo.vue'

export default {
  components: { FormulaBlock, CodeBlock, SourceLinks, NextPrev, CrossProductDemo },
  data() {
    return {
      code: `float3 N = normalize(cross(ddx, ddy)); // 几何法线
float3 B = normalize(cross(N, T));     // 副切线`,
      sources: [
        { title: '3Blue1Brown — 叉乘与行列式', url: 'https://www.youtube.com/watch?v=BaM7OCEm3G0' },
        { title: 'Unity 文档 Vector3.Cross', url: 'https://docs.unity3d.com/ScriptReference/Vector3.Cross.html' }
      ]
    }
  }
}
</script>
