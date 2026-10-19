using UnityEngine;
public class WavePointGPU : MonoBehaviour
{
    [Header("GPU计算资源")]
    public ComputeShader computeShader;
    public Shader pointShader;
    private Material pointMat;

    [Header("点网格参数")]
    [Tooltip("网格边长，总数=GridSize*GridSize。GridSize=1024 → 104万点")]
    public int GridSize = 1024;
    public float pointSize = 0.08f;

    [Header("波浪参数")]
    public float waveSpeed = 1.2f;
    public float waveHeight = 1.5f;
    public float waveFreq = 1.8f;

    private ComputeBuffer pointBuffer;
    private int kernelID;
    private int totalPointCount;

    void Start()
    {
        totalPointCount = GridSize * GridSize;
        // 结构体：float3 pos(12byte) + float3 color(12byte) = 24字节
        pointBuffer = new ComputeBuffer(totalPointCount, 24);
        
        // 获取ComputeShader内核
        kernelID = computeShader.FindKernel("CSMain");
        computeShader.SetBuffer(kernelID, "pointBuffer", pointBuffer);
        
        // 创建渲染材质
        pointMat = new Material(pointShader);
        pointMat.SetBuffer("pointBuffer", pointBuffer);
    }

    void Update()
    {
        if (pointBuffer == null) return;
        
        // 给ComputeShader传参数
        computeShader.SetFloat("_Time", Time.time);
        computeShader.SetFloat("_GridSize", GridSize);
        computeShader.SetFloat("_WaveSpeed", waveSpeed);
        computeShader.SetFloat("_WaveHeight", waveHeight);
        computeShader.SetFloat("_WaveFreq", waveFreq);
        
        // Dispatch GPU计算：8x8线程组
        int threadGroup = Mathf.CeilToInt(GridSize / 8f);
        computeShader.Dispatch(kernelID, threadGroup, threadGroup, 1);
        
        // 渲染参数
        pointMat.SetFloat("_PointSize", pointSize);
        Bounds renderBounds = new Bounds(Vector3.zero, Vector3.one * 30f);
        
        // 关键修改：改用Triangles拓扑，每个点6个顶点
        Graphics.DrawProcedural(pointMat, renderBounds, MeshTopology.Triangles, totalPointCount * 6);
    }

    void OnDestroy()
    {
        // 释放GPU内存，必须！否则显存泄漏
        if(pointBuffer != null)
        {
            pointBuffer.Release();
            pointBuffer = null;
        }
        if(pointMat != null)
        {
            Destroy(pointMat);
        }
    }
}
