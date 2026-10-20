using Unity.Collections.LowLevel.Unsafe;
using UnityEngine;
using Unity.Jobs;
using Unity.Collections;
using Unity.Burst;
using Unity.Mathematics;
using UnityEngine.Rendering;

public class FractalInstanced : MonoBehaviour
{
    struct PartState
    {
        public float3 position;
        public quaternion rotation;
        public quaternion localRotation;
        public float3 direction;
        public float scale;
        public int parentIndex;
    }

    
    
    [BurstCompile]
    struct UpdateLevelJob : IJobParallelFor
    {
        [ReadOnly]
        public NativeArray<PartState> input;

        [WriteOnly]
        public NativeArray<PartState> output;

        public quaternion deltaRotation;
        public int startIndex;

        public void Execute(int index)
        {
            int currentIndex = startIndex + index;

            PartState part = input[currentIndex];
            PartState parent = input[part.parentIndex];

            part.localRotation = math.mul(
                part.localRotation, deltaRotation
            );

            part.rotation = math.mul(
                parent.rotation, part.localRotation
            );

            part.position = parent.position +
                math.mul(
                    parent.rotation,
                    part.direction * (1.5f * part.scale)
                );

            output[index] = part;
        }
    }

    [SerializeField, Range(1, 8)]
    int depth = 3;

    [SerializeField, Range(0f, 180f)]
    float rotationSpeed = 45f;

    [SerializeField]
    Mesh mesh;

    [SerializeField]
    Material material;

    NativeArray<PartState> parts;
    NativeArray<PartState> nextParts;
    Matrix4x4[] matrices;

    const int BatchSize = 1023;

    static readonly float3[] Directions =
    {
        new float3(0, 1, 0),
        new float3(1, 0, 0),
        new float3(-1, 0, 0),
        new float3(0, 0, 1),
        new float3(0, 0, -1)
    };

    static readonly quaternion[] Rotations =
    {
        quaternion.identity,
        quaternion.EulerXYZ(
            new float3(0, 0, math.radians(-90f))
        ),
        quaternion.EulerXYZ(
            new float3(0, 0, math.radians(90f))
        ),
        quaternion.EulerXYZ(
            new float3(math.radians(90f), 0, 0)
        ),
        quaternion.EulerXYZ(
            new float3(math.radians(-90f), 0, 0)
        )
    };

    int GetLevelStart(int level)
    {
        int start = 0;
        int count = 1;

        for (int i = 0; i < level; i++)
        {
            start += count;
            count *= 5;
        }

        return start;
    }

    int GetLevelCount(int level)
    {
        int count = 1;

        for (int i = 0; i < level; i++)
            count *= 5;

        return count;
    }

    void Awake()
    {
        if (mesh == null || material == null)
        {
            Debug.LogError(
                "请在 Inspector 中指定 Mesh 和 Material。", this
            );
            enabled = false;
            return;
        }

        if (!SystemInfo.supportsInstancing)
        {
            Debug.LogError("当前设备不支持 GPU Instancing。", this);
            enabled = false;
            return;
        }

        material.enableInstancing = true;

        int total = 0;
        for (int i = 0; i < depth; i++)
            total += GetLevelCount(i);

        parts = new NativeArray<PartState>(
            total, Allocator.Persistent
        );
        nextParts = new NativeArray<PartState>(
            total, Allocator.Persistent
        );

        matrices = new Matrix4x4[BatchSize];

        // 根节点
        parts[0] = new PartState
        {
            position = float3.zero,
            rotation = quaternion.identity,
            localRotation = quaternion.identity,
            direction = float3.zero,
            scale = 1f,
            parentIndex = 0
        };

        // 初始化每一层。每个节点的父节点下标为 childIndex / 5。
        for (int level = 1; level < depth; level++)
        {
            int start = GetLevelStart(level);
            int parentStart = GetLevelStart(level - 1);
            int count = GetLevelCount(level);
            float scale = math.pow(0.5f, level);

            for (int i = 0; i < count; i++)
            {
                int childIndex = i;
                int directionIndex = childIndex % 5;
                int index = start + i;

                parts[index] = new PartState
                {
                    position = float3.zero,
                    rotation = quaternion.identity,
                    localRotation = Rotations[directionIndex],
                    direction = Directions[directionIndex],
                    scale = scale,
                    parentIndex = parentStart + i / 5
                };
            }
        }
    }

    void Update()
    {
        if (!parts.IsCreated)
            return;

        float angle = rotationSpeed * Time.deltaTime;
        quaternion deltaRotation = quaternion.EulerXYZ(
            new float3(0, math.radians(angle), 0)
        );

        
        // 根节点在主线程更新
        PartState root = parts[0];

        root.localRotation = math.mul(
            root.localRotation, deltaRotation
        );

        root.rotation = root.localRotation;
        parts[0] = root;
        nextParts[0] = root;

        JobHandle handle = default;

        for (int level = 1; level < depth; level++)
        {
            int start = GetLevelStart(level);
            int count = GetLevelCount(level);

            var job = new UpdateLevelJob
            {
                input = parts,
                output = nextParts,
                deltaRotation = deltaRotation,
                startIndex = start
            };

            handle = job.Schedule(count, 64, handle);

            // 当前层计算完成后，下一层才能读取它的父节点。
            handle.Complete();

            // 当前层计算结果复制回主数组，供下一层使用。
            for (int i = 0; i < count; i++)
            {
                parts[start + i] = nextParts[i];
            }
        }

        // 将计算结果转换为 GPU 实例矩阵。
        int batchCount = 0;

        for (int i = 0; i < parts.Length; i++)
        {
            PartState part = parts[i];
            
            if (math.lengthsq(part.rotation.value) < 1e-10f)
            {
                Debug.LogError(
                    $"无效四元数！index={i}, " +
                    $"parentIndex={part.parentIndex}, " +
                    $"rotation={part.rotation.value}, " +
                    $"localRotation={part.localRotation.value}"
                );

                continue;
            }

            matrices[batchCount++] = Matrix4x4.TRS(
                transform.position +
                    (Vector3)part.position,
                (Quaternion)part.rotation,
                Vector3.one * part.scale
            );

            if (batchCount == BatchSize)
            {
                DrawBatch(batchCount);
                batchCount = 0;
            }
        }

        if (batchCount > 0)
            DrawBatch(batchCount);
    }

    void DrawBatch(int count)
    {
        Graphics.DrawMeshInstanced(
            mesh,
            0,
            material,
            matrices,
            count,
            null,
            ShadowCastingMode.On,
            true,
            gameObject.layer
        );
    }

    void OnDestroy()
    {
        if (parts.IsCreated)
            parts.Dispose();

        if (nextParts.IsCreated)
            nextParts.Dispose();
    }
}
