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
        int Resolution { get; set; }
        Bounds Bounds { get; }
        int VertexCount { get; }
        int IndexCount { get; }
        int JobLength { get; }
        void Execute<S>(int i, S streams) where S : struct, IMeshStreams;
    }

    public interface IMeshStreams
    {
        void SetVertex(int index, VertexInfo data);
        void SetTriangle(int index, int3 triangle);
        void Setup(Mesh.MeshData data, Bounds bounds, int vertexCount, int indexCount);
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
            Mesh mesh, Mesh.MeshData meshData, int resolution, JobHandle dependency
        )
        {
            var job = new MeshJob<G, S>();
            job.generator.Resolution = resolution;
            job.streams.Setup(
                meshData, 
                mesh.bounds = job.generator.Bounds,
                job.generator.VertexCount,
                job.generator.IndexCount
            );
            return job.ScheduleParallel(job.generator.JobLength, 1, dependency);
        }
    }
}
