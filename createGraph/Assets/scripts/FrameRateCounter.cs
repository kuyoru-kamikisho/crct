using UnityEngine;
using TMPro;

public class FrameRateCounter : MonoBehaviour
{
    [Header("显示配置")]
    [Tooltip("帧率显示文本组件")]
    [SerializeField] private TextMeshProUGUI display;
    
    [Tooltip("文本刷新间隔（秒），值越大数值越稳、性能开销越低")]
    [SerializeField] private float updateInterval = 0.2f;
    
    [Tooltip("帧率显示小数位数")]
    [SerializeField] private int decimalPlaces = 1;

    [Header("计算规则")]
    [Tooltip("是否不受游戏时间缩放影响（暂停/慢动作时仍显示真实渲染帧率）")]
    [SerializeField] private bool useUnscaledTime = true;

    private float _accumulatedTime; // 累积时间
    private int _frameCount;        // 累积帧数
    private float _currentFps;      // 当前计算出的帧率

    private void Update()
    {
        // 选择使用的时间（受/不受时间缩放影响）
        float deltaTime = useUnscaledTime ? Time.unscaledDeltaTime : Time.deltaTime;
        
        _accumulatedTime += deltaTime;
        _frameCount++;

        // 达到刷新间隔时，计算平均帧率并更新文本
        if (_accumulatedTime >= updateInterval)
        {
            // 平均帧率 = 帧数 / 总时间，比单帧 1/deltaTime 更稳定
            _currentFps = _frameCount / _accumulatedTime;
            
            UpdateDisplayText();
            
            // 重置计数器，进入下一轮采样
            _accumulatedTime = 0f;
            _frameCount = 0;
        }
    }

    /// <summary>
    /// 更新显示文本，使用 TMP 原生格式化减少 GC 分配
    /// </summary>
    private void UpdateDisplayText()
    {
        if (display == null) return;
        
        // SetText 直接传入数值+格式，避免字符串拼接产生的 GC
        display.SetText("FPS: {0:" + decimalPlaces + "}", _currentFps);
    }

    /// <summary>
    /// 编辑器挂载时自动查找自身 TMP 组件（可选便利功能）
    /// </summary>
    private void Reset()
    {
        if (display == null)
        {
            display = GetComponent<TextMeshProUGUI>();
        }
    }
}
