Shader "Graph/Point Surface"
{
    Properties
    {
        // 基础颜色
        [MainColor] _BaseColor("Base Color", Color) = (1, 1, 1, 1)
    }
    SubShader
    {
        Tags { "RenderType" = "Opaque" "RenderPipeline" = "UniversalPipeline" }
        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION; // 物体空间顶点坐标
            };

            struct Varyings
            {
                float4 positionHCS : SV_POSITION; // 裁剪空间坐标
                float3 worldPos : TEXCOORD0;      // 传递世界坐标到片元着色器
            };

            CBUFFER_START(UnityPerMaterial)
                half4 _BaseColor;
            CBUFFER_END

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                // 物体空间坐标 -> 世界空间坐标
                float3 positionWS = TransformObjectToWorld(IN.positionOS.xyz);
                OUT.worldPos = positionWS;
                // 物体空间坐标 -> 裁剪空间
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                // worldPos xyz 直接作为 RGB，乘上基础颜色
                half3 col = IN.worldPos * _BaseColor.rgb;
                return half4(col, 1.0);
            }
            ENDHLSL
        }
    }
}
