using UnityEngine;
using Unity.Mathematics;
using Unity.Burst;
using Unity.Collections;
using Unity.Jobs;

namespace ProceduralMeshes
{
    public struct VertexInfo
    {
        public float3 position, normal;
        public float4 tangent;
        public float2 texCoord0;
    }

    public interface IMeshGenerator
    {
        int VertexCount { get; }
        int IndexCount { get; }
        int JobLength { get; }
        void Execute<S>(int i, S streams) where S : struct, IMeshStreams;
    }

    public interface IMeshStreams
    {
        void SetVertex(int index, VertexInfo data);
        void SetTriangle(int index, int3 triangle);
        void Setup(Mesh.MeshData data, int vertexCount, int indexCount);
    }

    [BurstCompile(FloatPrecision.Standard, FloatMode.Fast, CompileSynchronously = true)]
    public struct MeshJob<G, S> : IJobFor
        where G : struct, IMeshGenerator
        where S : struct, IMeshStreams
    {
        G generator;
        [WriteOnly]
        S streams;

        public void Execute(int i) => generator.Execute(i, streams);

        public static JobHandle ScheduleParallel(
            Mesh.MeshData meshData, JobHandle dependency
        )
        {
            var job = new MeshJob<G, S>();
            job.streams.Setup(
                meshData, job.generator.VertexCount, job.generator.IndexCount
            );
            return job.ScheduleParallel(job.generator.JobLength, 1, dependency);
        }
    }
}
