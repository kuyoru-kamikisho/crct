using UnityEngine;

public class Graph : MonoBehaviour
{
    [Header("基础设置")]
    [SerializeField] Transform pointPrefab;
    [SerializeField, Range(10, 200)] int resolution = 10;
    [SerializeField] FunctionLibrary.FunctionName function;

    [Header("自动切换设置")]
    [Tooltip("开启后自动循环切换所有波形")]
    [SerializeField] bool autoTransition = true;
    
    [Tooltip("单个波形稳定显示的时长（秒）")]
    [SerializeField, Min(0.1f)] float durationPerFunction = 3f;
    
    [Tooltip("两个波形之间的过渡变形时长（秒）")]
    [SerializeField, Min(0.01f)] float transitionDuration = 1f;

    Transform[] points;
    
    // 函数委托缓存
    private FunctionLibrary.Function _currentFunction;
    private FunctionLibrary.Function _previousFunction;
    private int _currentIndex;
    private int _functionCount;

    // 切换状态计时
    private float _timer;
    private float _transitionProgress;
    private bool _isTransitioning;


    void Awake()
    {
        float step = 2f / resolution;
        var scale = Vector3.one * step;
        points = new Transform[resolution * resolution];
        
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
            // 手动模式：实时同步Inspector选择的函数
            _currentFunction = FunctionLibrary.GetFunction(function);
        }

        // 更新所有顶点位置
        UpdatePointsPosition();
    }


    /// <summary>
    /// 处理自动切换的计时与状态流转
    /// </summary>
    void UpdateTransitionLogic()
    {
        _timer += Time.deltaTime;

        if (_isTransitioning)
        {
            // 过渡阶段：更新进度
            _transitionProgress = Mathf.Clamp01(_timer / transitionDuration);

            if (_transitionProgress >= 1f)
            {
                // 过渡结束，进入稳定显示阶段
                _isTransitioning = false;
                _timer = 0f;
                // 同步枚举字段，方便在Inspector查看当前状态
                function = (FunctionLibrary.FunctionName)_currentIndex;
            }
        }
        else
        {
            // 稳定显示阶段：计时结束则触发切换
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
    /// 更新所有点的位置，过渡时自动混合两个波形
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
                // 过渡中：混合上一个函数与当前函数的顶点位置
                Vector3 prevPos = _previousFunction(u, v, time);
                // SmoothStep 实现缓入缓出，过渡更自然
                float smoothT = Mathf.SmoothStep(0f, 1f, _transitionProgress);
                points[i].localPosition = Vector3.Lerp(prevPos, currentPos, smoothT);
            }
            else
            {
                points[i].localPosition = currentPos;
            }
        }
    }
}
