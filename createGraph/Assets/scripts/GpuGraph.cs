using UnityEngine;

public class GpuGraph : MonoBehaviour
{
    [Header("基础设置")]
    [SerializeField] Transform pointPrefab;
    [SerializeField, Range(10, 200)] int resolution = 10;
    [SerializeField] FunctionLibrary.FunctionName function;

    [SerializeField]
	Material material;

	[SerializeField]
	Mesh mesh;
    
    [Header("自动切换设置")]
    [Tooltip("开启后自动循环切换所有波形")]
    [SerializeField] bool autoTransition = true;
    
    [Tooltip("单个波形稳定显示的时长（秒）")]
    [SerializeField, Min(0.1f)] float durationPerFunction = 3f;
    
    [Tooltip("两个波形之间的过渡变形时长（秒）")]
    [SerializeField, Min(0.01f)] float transitionDuration = 1f;

    [Header("GPU计算设置")]
    [SerializeField] ComputeShader computeShader;
    [Tooltip("启用GPU计算，关闭则回退到CPU计算")]
    [SerializeField] bool useGPUCompute = true;

    private Transform[] points;
    
    // 函数委托缓存
    private FunctionLibrary.Function _currentFunction;
    private FunctionLibrary.Function _previousFunction;
    private int _currentIndex;
    private int _functionCount;
    // 切换状态计时
    private float _timer;
    private float _transitionProgress;
    private bool _isTransitioning;

    // Compute Shader 相关变量
    private ComputeBuffer positionsBuffer;
    private Vector3[] positionCache; // 缓存GPU回读的位置数据
    private int kernelIndex;
    
    private static readonly int
        positionsId = Shader.PropertyToID("_Positions"),
        resolutionId = Shader.PropertyToID("_Resolution"),
        stepId = Shader.PropertyToID("_Step"),
        timeId = Shader.PropertyToID("_Time");
    
    void Awake()
    {
        float step = 2f / resolution;
        var scale = Vector3.one * step;
        points = new Transform[resolution * resolution];
        positionCache = new Vector3[resolution * resolution];
        
        // 实例化所有点
        for (int i = 0; i < points.Length; i++)
        {
            Transform point = points[i] = Instantiate(pointPrefab);
            point.localScale = scale;
            point.SetParent(transform, false);
        }
        
        // 初始化函数信息
        _functionCount = System.Enum.GetValues(typeof(FunctionLibrary.FunctionName)).Length;
        _currentIndex = (int)function;
        _currentFunction = FunctionLibrary.GetFunction(function);

        // 初始化ComputeBuffer
        if (useGPUCompute && computeShader != null)
        {
            // 每个元素为float3，占 3 * 4 = 12 字节
            positionsBuffer = new ComputeBuffer(resolution * resolution, 3 * 4);
            kernelIndex = computeShader.FindKernel("FunctionKernel");
        }
    }

    void OnEnable()
    {
        // 组件重新启用时，若Buffer已释放则重建
        if (useGPUCompute && computeShader != null && positionsBuffer == null)
        {
            positionsBuffer = new ComputeBuffer(resolution * resolution, 3 * 4);
            kernelIndex = computeShader.FindKernel("FunctionKernel");
        }
    }

    void OnDisable()
    {
        // 释放显存，避免内存泄漏
        if (positionsBuffer != null)
        {
            positionsBuffer.Release();
            positionsBuffer = null;
        }
    }

    void Update()
    {
        // 处理自动切换逻辑
        if (autoTransition)
        {
            UpdateTransitionLogic();
        }
        else
        {
            // 手动模式：同步Inspector选择的函数
            _currentFunction = FunctionLibrary.GetFunction(function);
        }

        if (useGPUCompute && computeShader != null)
        {
            UpdateFunctionOnGPU();    // GPU计算位置
            ApplyGpuResultToPoints(); // 回读结果并应用到点
        }
        else
        {
            UpdatePointsPosition();   // 原CPU计算逻辑
        }
    }

    /// <summary>
    /// 处理自动切换的计时与状态流转
    /// </summary>
    void UpdateTransitionLogic()
    {
        _timer += Time.deltaTime;
        if (_isTransitioning)
        {
            _transitionProgress = Mathf.Clamp01(_timer / transitionDuration);
            if (_transitionProgress >= 1f)
            {
                _isTransitioning = false;
                _timer = 0f;
                function = (FunctionLibrary.FunctionName)_currentIndex;
            }
        }
        else
        {
            if (_timer >= durationPerFunction)
            {
                StartNextTransition();
                _timer = 0f;
            }
        }
    }

    /// <summary>
    /// 触发向下一个波形的过渡动画
    /// </summary>
    void StartNextTransition()
    {
        _previousFunction = _currentFunction;
        _currentIndex = (_currentIndex + 1) % _functionCount;
        _currentFunction = FunctionLibrary.GetFunction((FunctionLibrary.FunctionName)_currentIndex);
        
        _isTransitioning = true;
        _transitionProgress = 0f;
    }

    /// <summary>
    /// CPU计算：更新所有点的位置，过渡时自动混合两个波形
    /// </summary>
    void UpdatePointsPosition()
    {
        float time = Time.time;
        float step = 2f / resolution;
        float v = 0.5f * step - 1f;
        
        for (int i = 0, x = 0, z = 0; i < points.Length; i++, x++)
        {
            if (x == resolution)
            {
                x = 0;
                z += 1;
                v = (z + 0.5f) * step - 1f;
            }
            
            float u = (x + 0.5f) * step - 1f;
            Vector3 currentPos = _currentFunction(u, v, time);
            
            if (_isTransitioning)
            {
                Vector3 prevPos = _previousFunction(u, v, time);
                float smoothT = Mathf.SmoothStep(0f, 1f, _transitionProgress);
                points[i].localPosition = Vector3.Lerp(prevPos, currentPos, smoothT);
            }
            else
            {
                points[i].localPosition = currentPos;
            }
        }
    }

    /// <summary>
    /// 调用Compute Shader在GPU端计算所有点的位置
    /// </summary>
    void UpdateFunctionOnGPU()
    {
        float step = 2f / resolution;
        computeShader.SetInt(resolutionId, resolution);
        computeShader.SetFloat(stepId, step);
        computeShader.SetFloat(timeId, Time.time);
        computeShader.SetBuffer(kernelIndex, positionsId, positionsBuffer);
        
        // 向上取整线程组，配合Shader内的边界判断避免越界
        int groups = Mathf.CeilToInt(resolution / 8f);
        computeShader.Dispatch(kernelIndex, groups, groups, 1);

        // 让GPU使用一个网格一个材质绘制多次
        var bounds = new Bounds(Vector3.zero, Vector3.one * (2f + 2f / resolution));
		Graphics.DrawMeshInstancedProcedural(
			mesh, 0, material, bounds, positionsBuffer.count
		);
    }

    /// <summary>
    /// 将GPU计算结果回读内存，并赋值给所有Transform点
    /// </summary>
    void ApplyGpuResultToPoints()
    {
        positionsBuffer.GetData(positionCache);
        
        // 注意：当前Compute Shader仅实现单个Wave函数
        // 多函数切换、过渡动画需扩展Shader后才能在GPU端生效
        for (int i = 0; i < points.Length; i++)
        {
            points[i].localPosition = positionCache[i];
        }
    }
}
