Shader "Unlit/PointRenderShader"
{
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry"}
        LOD 100
        Cull Off
        ZWrite On
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct PointData
            {
                float3 pos;
                float3 color;
            };
            StructuredBuffer<PointData> pointBuffer;
            float _PointSize;
            // ==========删掉这一行！！ float4 _ScreenParams; ==========

            // 6顶点 两个三角形
            static float2 quadUVs[6] = {
                float2(-0.5,-0.5), // 0 左下
                float2(-0.5, 0.5), // 1 左上
                float2( 0.5,-0.5), // 2 右下
                float2( 0.5,-0.5), // 3 右下
                float2(-0.5, 0.5), // 4 左上
                float2( 0.5, 0.5)  // 5 右上
            };

            struct appdata
            {
                uint id : SV_VertexID;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float3 col : COLOR;
                float2 uv : TEXCOORD0;
            };

            v2f vert (appdata v)
            {
                v2f o;
                uint pointIndex = v.id / 6;
                uint quadVertID = v.id % 6;
                PointData pd = pointBuffer[pointIndex];

                float3 viewPos = UnityWorldToViewPos(pd.pos);
                float2 offset = quadUVs[quadVertID] * _PointSize;
                // 直接使用内置 _ScreenParams，无需声明
                offset.x *= _ScreenParams.y / _ScreenParams.x;
                
                viewPos.xy += offset;
                o.pos = mul(UNITY_MATRIX_P, float4(viewPos, 1));

                o.uv = quadUVs[quadVertID];
                o.col = pd.color;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float dist = length(i.uv);
                float edge = fwidth(dist);
                float alpha = smoothstep(0.5, 0.5 - edge, dist);
                if(alpha < 0.01) discard;
                
                return fixed4(i.col, alpha);
            }
            ENDCG
        }
    }
}
