<template>
  <article class="article">
    <p class="chip">03 光照与着色</p>
    <h1>Lambert 与 Phong 光照</h1>
    <p class="lead">实时渲染里最经典的经验模型：环境光垫底，Lambert 负责「朝向灯的一面亮」，Phong 负责「高光点」。PBR 流行之后它们仍是面试必考，也是写风格化 Shader 的底子。</p>

    <FormulaBlock
      latex="I = k_a + k_d \max(N\cdot L, 0) + k_s \max(R\cdot V, 0)^{n}"
      :symbols="[
        { s: 'I', d: '该点最终亮度（再乘颜色）' },
        { s: 'k_a', d: '环境光系数，避免背光纯黑' },
        { s: 'k_d', d: '漫反射系数' },
        { s: 'k_s', d: '高光系数' },
        { s: 'N', d: '单位法线' },
        { s: 'L', d: '指向灯光的单位向量' },
        { s: 'V', d: '指向相机的单位向量' },
        { s: 'R', d: 'L 关于 N 的反射向量' },
        { s: 'n', d: '光泽度，越大高光越尖' }
      ]"
    />
    <LightingDemo />

    <h2>Blinn-Phong</h2>
    <p>用半角 H = normalize(L+V)，高光改成 (N·H)^n。视点贴近灯光时更稳，GPU 也少算一次 reflect。Unity 旧版 Standard 之前大量内置 Shader 用它。</p>
    <CodeBlock lang="hlsl" :code="code" />
    <div class="callout">这些模型不守恒能量：kd、ks 可以同时很大，表面会「比灯还亮」。PBR 用微表面和 Fresnel 把这块补上。</div>

    <SourceLinks :items="sources" />
    <NextPrev slug="lighting" />
  </article>
</template>

<script>
import FormulaBlock from '../components/FormulaBlock.vue'
import CodeBlock from '../components/CodeBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import LightingDemo from '../demos/LightingDemo.vue'

export default {
  components: { FormulaBlock, CodeBlock, SourceLinks, NextPrev, LightingDemo },
  data() {
    return {
      code: `float3 H = normalize(L + V);
float spec = pow(saturate(dot(N, H)), smoothness);
float3 color = ka + kd * saturate(dot(N, L)) + ks * spec;`,
      sources: [
        { title: 'LearnOpenGL — Basic Lighting / Materials', url: 'https://learnopengl.com/Lighting/Basic-Lighting' },
        { title: 'Bilibili 搜索：Blinn-Phong 讲解', url: 'https://search.bilibili.com/all?keyword=Blinn-Phong%20%E5%85%89%E7%85%A7' }
      ]
    }
  }
}
</script>
