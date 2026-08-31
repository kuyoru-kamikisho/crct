<template>
  <article class="article">
    <p class="chip">02 图形学基础</p>
    <h1>相机与投影</h1>
    <p class="lead">眼睛为什么近大远小？因为透视矩阵把深度写进了齐次坐标的 w，GPU 再做一次除法。正交投影没有这一步，所以物体大小与远近无关。</p>

    <FormulaBlock
      latex="x_{ndc} = x_{clip}/w,\quad y_{ndc}=y_{clip}/w,\quad z_{ndc}=z_{clip}/w"
      :symbols="[
        { s: 'x_{clip}, y_{clip}, z_{clip}, w', d: '投影矩阵输出的齐次裁剪坐标' },
        { s: 'x_{ndc}, y_{ndc}, z_{ndc}', d: '透视除法之后的归一化设备坐标，大约在 [-1,1]' },
        { s: 'w', d: '与深度相关的量：越远通常 |w| 越大，xy 被除得越小' }
      ]"
    />
    <ProjectionDemo />

    <h2>FOV 与裁剪面</h2>
    <ul>
      <li><strong>FOV：</strong>竖向张角。大 FOV 有广角畸变，角色脸会胖；过小像望远镜。</li>
      <li><strong>Near / Far：</strong>深度缓冲精度按对数挤在近处。Near 设成 0.01、Far 一万，远景必闪（Z-Fighting）。</li>
    </ul>
    <div class="callout warn">阴影贴图常用正交相机从灯往下看。方向光没有「一个点」，正交更合适。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="camera" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import ProjectionDemo from '../demos/ProjectionDemo.vue'

export default {
  components: { FormulaBlock, SourceLinks, NextPrev, ProjectionDemo },
  data() {
    return {
      sources: [
        { title: 'LearnOpenGL — Coordinate Systems（透视）', url: 'https://learnopengl.com/Getting-started/Coordinate-Systems' },
        { title: 'Scratchapixel — Perspective Projection', url: 'https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/projection-matrix-introduction.html' }
      ]
    }
  }
}
</script>
