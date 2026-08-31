<template>
  <article class="article">
    <p class="chip">01 数学基础</p>
    <h1>从 1+1 到向量</h1>
    <p class="lead">如果你觉得向量抽象，先回到数轴。1+1=2 不是规定，而是两段位移接在一起。向量只是把这段位移从「一条线」放开到「一个平面 / 空间」。</p>

    <h2>标量加法：同一条数轴上的位移</h2>
    <p>标量只有大小和正负。在数轴上，+1 表示向右一格。先走 1，再走 1，终点离原点 2 格——这就是 1+1=2 的几何意义。</p>
    <FormulaBlock
      latex="a + b = s"
      :symbols="[
        { s: 'a', d: '第一段位移（可正可负）' },
        { s: 'b', d: '第二段位移' },
        { s: 's', d: '两段首尾相接后的总位移' }
      ]"
    />
    <ScalarAddDemo />

    <h2>向量：带方向的箭头</h2>
    <p>平面上的位移需要两个数 (x, y)。向量加法仍然是「首尾相接」，画出来是平行四边形的对角线。减法 A−B 则是从 B 指向 A 的箭头。</p>
    <FormulaBlock
      latex="\vec{A} + \vec{B} = (A_x+B_x,\; A_y+B_y)"
      :symbols="[
        { s: '\\vec{A},\\vec{B}', d: '两个向量' },
        { s: 'A_x, A_y', d: 'A 在 x、y 方向上走了多少' },
        { s: 'B_x, B_y', d: 'B 的分量' }
      ]"
    />
    <VectorAddDemo />

    <h2>长度与单位向量</h2>
    <p>长度（模）是箭头有多长。除以长度得到单位向量，只保留方向——法线、光线方向几乎都要先归一化，否则点乘会被长度污染。</p>
    <FormulaBlock
      latex="|\vec{A}| = \sqrt{A_x^2 + A_y^2},\quad \hat{A} = \vec{A}/|\vec{A}|"
      :symbols="[
        { s: '|\\vec{A}|', d: '向量长度（模）' },
        { s: '\\hat{A}', d: '与 A 同向、长度为 1 的单位向量' }
      ]"
    />
    <div class="callout warn">Shader 里 normalize(N) 漏写，是「光照忽亮忽暗、角色变胖高光乱飞」的常见原因。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="vectors" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import ScalarAddDemo from '../demos/ScalarAddDemo.vue'
import VectorAddDemo from '../demos/VectorAddDemo.vue'

export default {
  components: { FormulaBlock, SourceLinks, NextPrev, ScalarAddDemo, VectorAddDemo },
  data() {
    return {
      sources: [
        { title: '3Blue1Brown — 向量究竟是什么', url: 'https://www.youtube.com/watch?v=fNk_zzaMoSs' },
        { title: '可汗学院 向量入门', url: 'https://www.khanacademy.org/math/linear-algebra/vectors-and-spaces' }
      ]
    }
  }
}
</script>
