using Unity.Burst;
using Unity.Collections;
using Unity.Jobs;
using Unity.Mathematics;
using UnityEngine;

using static Unity.Mathematics.math;

public class HashVisualization : MonoBehaviour {

	static int
		hashesId = Shader.PropertyToID("_Hashes"),
		configId = Shader.PropertyToID("_Config");

	[SerializeField]
	Mesh instanceMesh;

	[SerializeField]
	Material material;

	[SerializeField, Range(1, 512)]
	int resolution = 16;

	NativeArray<uint> hashes;

	ComputeBuffer hashesBuffer;

	MaterialPropertyBlock propertyBlock;

    [BurstCompile(FloatPrecision.Standard, FloatMode.Fast, CompileSynchronously = true)]
	struct HashJob : IJobFor {

		[WriteOnly]
		public NativeArray<uint> hashes;
        
		public void Execute(int i) {
			hashes[i] = (uint)i;
		}
	}

    void OnEnable () {
		int length = resolution * resolution;
		hashes = new NativeArray<uint>(length, Allocator.Persistent);
		hashesBuffer = new ComputeBuffer(length, 4);

		new HashJob {
			hashes = hashes
		}.ScheduleParallel(hashes.Length, resolution, default).Complete();

		hashesBuffer.SetData(hashes);

		propertyBlock ??= new MaterialPropertyBlock();
		propertyBlock.SetBuffer(hashesId, hashesBuffer);
		propertyBlock.SetVector(configId, new Vector4(resolution, 1f / resolution));
	}

    void Update () {
		Graphics.DrawMeshInstancedProcedural(
			instanceMesh, 0, material, new Bounds(Vector3.zero, Vector3.one),
			hashes.Length, propertyBlock
		);
	}
    
    void OnDisable () {
		hashes.Dispose();
		hashesBuffer.Release();
		hashesBuffer = null;
	}

	void OnValidate () {
		if (hashesBuffer != null && enabled) {
			OnDisable();
			OnEnable();
		}
	}
}