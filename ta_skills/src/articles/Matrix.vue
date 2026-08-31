<template>
  <article class="article">
    <p class="chip">01 数学基础</p>
    <h1>矩阵与 2D 变换</h1>
    <p class="lead">缩放、旋转、平移都可以写成「矩阵乘向量」。TA 不需要手算 16 个数，但必须知道：顺序会改结果，平移必须靠齐次坐标。</p>

    <h2>线性变换：缩放与旋转</h2>
    <FormulaBlock
      latex="R(\theta)=\begin{pmatrix}\cos\theta & -\sin\theta \\ \sin\theta & \cos\theta\end{pmatrix},\quad S=\begin{pmatrix}s_x & 0 \\ 0 & s_y\end{pmatrix}"
      :symbols="[
        { s: 'R(\\theta)', d: '绕原点逆时针旋转 θ 的矩阵' },
        { s: '\\theta', d: '旋转角，演示器里用角度，公式里是弧度' },
        { s: '\\cos\\theta,\\sin\\theta', d: '该角的余弦与正弦' },
        { s: 'S', d: '沿轴缩放矩阵' },
        { s: 's_x, s_y', d: 'x、y 方向的缩放倍数' }
      ]"
    />
    <p>列向量约定下，先应用的矩阵写在右边：先缩放再旋转是 R·S·p。</p>

    <h2>平移不是线性的</h2>
    <p>纯 2×2 矩阵过原点，变不出平移。补一个 1，写成 3 维齐次坐标，平移就能放进矩阵最后一列。</p>
    <FormulaBlock
      :latex="latexT"
      :symbols="symT"
    />
    <Matrix2DDemo />

    <div class="callout">引擎里常见 TRS：先 Scale，再 Rotate，再 Translate。父物体的矩阵再乘在左边。子物体「跟着父物体转」就是这个乘法链。</div>
    <CodeBlock lang="js" :code="code" />

    <SourceLinks :items="sources" />
    <NextPrev slug="matrix" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import CodeBlock from '../components/CodeBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import Matrix2DDemo from '../demos/Matrix2DDemo.vue'

export default {
  components: { FormulaBlock, CodeBlock, SourceLinks, NextPrev, Matrix2DDemo },
  data() {
    return {
      code: `// 伪代码：列向量右乘
p2 = T * R * S * p1`,
      latexT: "T=\\begin{pmatrix}1 & 0 & t_x \\\\ 0 & 1 & t_y \\\\ 0 & 0 & 1\\end{pmatrix},\\quad \\begin{pmatrix}x' \\\\ y' \\\\ 1\\end{pmatrix}=T\\begin{pmatrix}x \\\\ y \\\\ 1\\end{pmatrix}",
      symT: [
        { s: 'T', d: '平移矩阵' },
        { s: 't_x, t_y', d: '沿 x、y 移动的距离' },
        { s: 'x, y', d: '变换前的坐标' },
        { s: "x', y'", d: '变换后的坐标' },
        { s: '1', d: '齐次分量，让平移能写成乘法' }
      ],
      sources: [
        { title: '3Blue1Brown — 矩阵与线性变换', url: 'https://www.youtube.com/watch?v=kYB8IZa5AuE' },
        { title: 'LearnOpenGL — Transformations', url: 'https://learnopengl.com/Getting-started/Transformations' }
      ]
    }
  }
}
</script>
