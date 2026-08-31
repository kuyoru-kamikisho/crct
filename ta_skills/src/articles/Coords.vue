<template>
  <article class="article">
    <p class="chip">01 数学基础</p>
    <h1>坐标系：世界从原点开始</h1>
    <p class="lead">技术美术里几乎所有位置、方向、UV、法线，最后都要落在某个坐标系里。把「坐标」看成沿轴走了多少格，后面的向量和矩阵才不会飘。</p>

    <h2>笛卡尔坐标系</h2>
    <p>选定一个原点 O，再选两条互相垂直的轴。点 P 的坐标 (x, y) 的意思是：从 O 沿 x 轴走 x，再沿 y 轴走 y。三维只是再加一条 z 轴。</p>
    <FormulaBlock
      latex="P = x\,\mathbf{i} + y\,\mathbf{j} + z\,\mathbf{k}"
      :symbols="[
        { s: 'P', d: '空间中的一个点（或从原点指向它的位置向量）' },
        { s: 'x, y, z', d: '该点在三条轴上的分量' },
        { s: '\\mathbf{i},\\mathbf{j},\\mathbf{k}', d: '三条轴的单位方向，长度都是 1' }
      ]"
    />

    <CoordsDemo />

    <h2>左手系还是右手系？</h2>
    <p>伸开手：拇指 x、食指 y、中指 z。Unity 世界空间是<strong>左手系</strong>（Z 向前），数学课和 OpenGL 文档常用<strong>右手系</strong>。换引擎时先问「哪根轴朝上、哪根朝前」，否则导入的模型会躺着或镜像。</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>环境</th><th>常见约定</th></tr></thead>
        <tbody>
          <tr><td>中学数学 / Blender（Z-up）</td><td>右手，Z 向上</td></tr>
          <tr><td>Unity 世界</td><td>左手，Y 向上，Z 向前</td></tr>
          <tr><td>Unreal</td><td>左手，Z 向上</td></tr>
          <tr><td>屏幕 / 纹理 UV</td><td>原点常在左上或左下，V 方向要对齐</td></tr>
        </tbody>
      </table>
    </div>

    <h2>局部空间与世界空间</h2>
    <p>角色手里的剑，顶点坐标写在「剑自己的空间」里（局部）。要画到屏幕上，得先变到世界、再变到相机、再投影。TA 日常排错：模型飞了、绑错骨骼、特效跟手，十有八九是空间搞错了。</p>
    <div class="callout">面试常问：物体空间、世界空间、观察空间、裁剪空间、屏幕空间各是什么。建议结合下一篇「向量」和后面的「MVP」一起记。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="coords" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import CoordsDemo from '../demos/CoordsDemo.vue'

export default {
  components: { FormulaBlock, SourceLinks, NextPrev, CoordsDemo },
  data() {
    return {
      sources: [
        { title: '3Blue1Brown《线性代数的本质》坐标系与基', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab' },
        { title: 'LearnOpenGL — Coordinate Systems', url: 'https://learnopengl.com/Getting-started/Coordinate-Systems' }
      ]
    }
  }
}
</script>
