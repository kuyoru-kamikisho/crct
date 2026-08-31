<template>
  <article class="article">
    <p class="chip">04 引擎实践</p>
    <h1>实践：用 Unity 写第一个 Shader</h1>
    <p class="lead">理论看完必须上手。下面按步在 Unity URP 里做出一张「可调颜色 + Lambert」的材质。做完你就具备改 TA 需求的最小闭环。</p>

    <h2>准备</h2>
    <ul>
      <li>安装 Unity Hub，新建 3D (URP) 模板项目。</li>
      <li>场景放一个 Sphere，Directional Light 保持默认。</li>
    </ul>

    <ol class="steps">
      <li>
        <strong>创建 Shader 文件</strong><br />
        Project 窗口右键 → Create → Shader → Unlit Shader（随后我们改成带光照）。命名 <code>TA_Lambert</code>。
      </li>
      <li>
        <strong>换成 URP 可合批的结构</strong><br />
        用下面代码覆盖文件。关键点：<code>HLSLPROGRAM</code>、<code>CBUFFER_START(UnityPerMaterial)</code> 才能吃到 SRP Batcher。
      </li>
      <li>
        <strong>创建材质并赋给球体</strong><br />
        Create → Material，Shader 选 Unlit/TA_Lambert（或你 Tags 里的名字）。拖到 Sphere。
      </li>
      <li>
        <strong>调参数观察</strong><br />
        改 <code>_Color</code>，旋转灯光，确认背光面变暗。打开 Frame Debugger 看这一次 Draw。
      </li>
      <li>
        <strong>故意写错一次</strong><br />
        删掉一行分号，看球体变洋红、Console 报哪一行——这是以后每天都要面对的反馈。
      </li>
    </ol>

    <CodeBlock lang="hlsl" :code="shader" />

    <p>写完后，球体受光应接近下面演示器：朝向灯的一面亮，背面只剩一点环境光。把灯光方位拖一下对照场景。</p>
    <LightingDemo />

    <h2>这一步你练到了什么</h2>
    <ul>
      <li>属性如何出现在 Inspector（<code>_Color</code>）。</li>
      <li>顶点里做 MVP，片元里做 N·L。</li>
      <li>URP 的 include 与 Light 结构从哪来。</li>
    </ul>
    <div class="callout">作业：给 Shader 加一张 Albedo 贴图，用 TRANSFORM_TEX 做 Tiling/Offset，然后对比关 sRGB 时颜色哪里不对。</div>

    <h2>常见翻车</h2>
    <ul>
      <li>项目是 URP，却用了 Built-in 的 Surface Shader → 洋红。</li>
      <li>属性放在 CBUFFER 外面 → SRP Batcher 不合批。</li>
      <li>法线没归一化或没转到世界空间 → 光照随模型缩放乱跳。</li>
    </ul>

    <SourceLinks :items="sources" />
    <NextPrev slug="unity-shader" />
  </article>
</template>

<script>
import CodeBlock from '../components/CodeBlock.vue'
import SourceLinks from '../components/SourceLinks.vue'
import NextPrev from '../components/NextPrev.vue'
import LightingDemo from '../demos/LightingDemo.vue'

export default {
  components: { CodeBlock, SourceLinks, NextPrev, LightingDemo },
  data() {
    return {
      shader: `Shader "Unlit/TA_Lambert"
{
    Properties
    {
        _Color ("Color", Color) = (0.3, 0.8, 0.75, 1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
            Name "Forward"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            CBUFFER_START(UnityPerMaterial)
                float4 _Color;
            CBUFFER_END

            struct Attr {
                float4 pos : POSITION;
                float3 nrm : NORMAL;
            };
            struct V2F {
                float4 pos : SV_POSITION;
                float3 nws : TEXCOORD0;
            };

            V2F vert(Attr v)
            {
                V2F o;
                o.pos = TransformObjectToHClip(v.pos.xyz);
                o.nws = TransformObjectToWorldNormal(v.nrm);
                return o;
            }

            half4 frag(V2F i) : SV_Target
            {
                Light light = GetMainLight();
                float3 N = normalize(i.nws);
                float ndotl = saturate(dot(N, light.direction));
                float3 col = _Color.rgb * light.color * ndotl + _Color.rgb * 0.08;
                return half4(col, 1);
            }
            ENDHLSL
        }
    }
}`,
      sources: [
        { title: 'Unity 手册 URP Shader', url: 'https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@latest' },
        { title: 'Unity 下载', url: 'https://unity.com/download' },
        { title: 'Bilibili 搜索：URP Shader 入门', url: 'https://search.bilibili.com/all?keyword=URP%20Shader%20%E5%85%A5%E9%97%A8' }
      ]
    }
  }
}
</script>
