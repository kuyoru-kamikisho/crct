<template>
  <article class="article">
    <p class="chip">03 光照与着色</p>
    <h1>Shader 是什么：顶点与片元</h1>
    <p class="lead">Shader 是跑在 GPU 上的小程序。顶点着色器处理每个顶点（算位置、传 UV）；片元着色器处理每个像素（算颜色）。下面这块演练场就是后者：改代码立刻出图。</p>

    <ShaderPlayground />

    <h2>数据怎么流</h2>
    <FormulaBlock
      latex="v_{\text{clip}} = P\,V\,M\,v_{\text{local}}"
      :symbols="[
        { s: 'v_{\\text{local}}', d: '网格自带的顶点位置' },
        { s: 'M,V,P', d: '模型、视图、投影矩阵，通常由引擎注入' },
        { s: 'v_{\\text{clip}}', d: '顶点着色器必须输出的裁剪空间坐标' }
      ]"
    />
    <ul>
      <li><strong>Attribute：</strong>每个顶点不同（位置、法线、UV）。</li>
      <li><strong>Uniform / CBUFFER：</strong>一次 Draw 内相同（MVP、灯光、材质参数）。</li>
      <li><strong>Varying：</strong>顶点输出、光栅化插值后给片元（UV、世界法线）。</li>
    </ul>
    <CodeBlock lang="glsl" :code="code" />
    <div class="callout">HLSL（Unity/DirectX）和 GLSL（OpenGL/Vulkan 部分、Shadertoy）语法不同，思路一样。本站演练场用 GLSL，Unity 实践页用 ShaderLab/HLSL。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="shader" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import CodeBlock from '../components/CodeBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import ShaderPlayground from '../demos/ShaderPlayground.vue'

export default {
  components: { FormulaBlock, CodeBlock, SourceLinks, NextPrev, ShaderPlayground },
  data() {
    return {
      code: `attribute vec3 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
uniform mat4 u_mvp;
void main() {
  v_uv = a_uv;
  gl_Position = u_mvp * vec4(a_pos, 1.0);
}`,
      sources: [
        { title: 'The Book of Shaders', url: 'https://thebookofshaders.com/' },
        { title: 'Shadertoy', url: 'https://www.shadertoy.com/' },
        { title: 'LearnOpenGL — Shaders', url: 'https://learnopengl.com/Getting-started/Shaders' }
      ]
    }
  }
}
</script>
