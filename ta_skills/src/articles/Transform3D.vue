<template>
  <article class="article">
    <p class="chip">01 数学基础</p>
    <h1>3D 变换与齐次坐标</h1>
    <p class="lead">三维物体要同时旋转、缩放、挪位置，工业界统一用 4×4 矩阵。第四维的 1 不是玄学，是为了把平移塞进乘法。</p>

    <FormulaBlock :latex="latexM" :symbols="symM" />
    <p>方向向量（法线、光线）平移不该生效，所以 w=0。法线还要用「逆转置」的 3×3，否则非均匀缩放会把法线拧歪——面试高频。</p>
    <Transform3DDemo />

    <h2>MVP 一眼记</h2>
    <ol>
      <li><strong>M Model：</strong>物体自己的 TRS，局部 → 世界。</li>
      <li><strong>V View：</strong>世界 → 相机（相当于相机逆变换）。</li>
      <li><strong>P Projection：</strong>相机 → 裁剪空间，之后 GPU 做透视除法。</li>
    </ol>
    <p>四元数是另一套表示旋转的方法，没有欧拉角万向节死锁，骨骼动画和相机插值都会用。入门阶段记住：引擎里看到 Quaternion，本质是「绕轴转一个角」的紧凑写法。</p>

    <SourceLinks :items="sources" />
    <NextPrev slug="transform-3d" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import Transform3DDemo from '../demos/Transform3DDemo.vue'

export default {
  components: { FormulaBlock, SourceLinks, NextPrev, Transform3DDemo },
  data() {
    return {
      latexM: "\\begin{pmatrix}x' \\\\ y' \\\\ z' \\\\ w\\end{pmatrix} = M_{4\\times 4} \\begin{pmatrix}x \\\\ y \\\\ z \\\\ 1\\end{pmatrix}",
      symM: [
        { s: 'x,y,z', d: '局部空间顶点' },
        { s: '1', d: '齐次坐标的 w，位置用 1，纯方向用 0（方向不被平移）' },
        { s: 'M_{4\\times 4}', d: '模型 / 视图 / 投影等 4×4 矩阵' },
        { s: "x',y',z'", d: '变换后的坐标（投影阶段还要除以 w）' },
        { s: 'w', d: '透视投影后与深度相关，做透视除法用' }
      ],
      sources: [
        { title: 'LearnOpenGL — Coordinate Systems / MVP', url: 'https://learnopengl.com/Getting-started/Coordinate-Systems' },
        { title: 'Gribb & Hartmann 《Understanding the View Frustum》', url: 'https://www.gamedevs.org/uploads/fast-extraction-viewing-frustum-planes-from-world-view-projection-matrix.pdf' }
      ]
    }
  }
}
</script>
