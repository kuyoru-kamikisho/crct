using UnityEngine;
using Unity.Mathematics;

namespace ProceduralMeshes.MeshGenerator
{
    public struct SquareGrid : IMeshGenerator {
        public int VertexCount => 4;

        public int IndexCount => 6;


        // 通过1、0控制job的开关
        public int JobLength => 1;

        public void Execute<S>(int i, S streams) where S : struct, IMeshStreams
        {
            var vertex = new VertexInfo();
            vertex.normal = new float3(0f, 0f, -1f);
            vertex.tangent.xw = new float2(1f, -1f);

            streams.SetVertex(0, vertex); // (0,0,0)

            vertex.position = new float3(1f, 0f, 0f);
            vertex.texCoord0 = new float2(1f, 0f);
            streams.SetVertex(1, vertex);

            vertex.position = new float3(0f, 1f, 0f);
            vertex.texCoord0 = new float2(0f, 1f);
            streams.SetVertex(2, vertex);

            vertex.position = new float3(1f, 1f, 0f);
            vertex.texCoord0 = new float2(1f, 1f);
            streams.SetVertex(3, vertex);

            streams.SetTriangle(0, new int3(0, 2, 1));
            streams.SetTriangle(1, new int3(1, 2, 3));
        }
    }
}
