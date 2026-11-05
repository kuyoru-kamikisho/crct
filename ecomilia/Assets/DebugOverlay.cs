
using System.Text;
using TMPro;
using UnityEngine;

public class DebugOverlay : MonoBehaviour
{
    [Header("UI")]
    [SerializeField] private TMP_Text infoText;

    [Header("刷新间隔")]
    [SerializeField] private float fpsInterval = 2f;
    [SerializeField] private float uiInterval = 0.25f;

    // FPS 统计
    private int frameCount;
    private float elapsedTime;

    private float currentFps;
    private float currentFrameTime;

    // UI 刷新
    private float uiTimer;

    // 网络状态：由网络模块主动更新
    private bool isConnected;
    private int ping = -1;
    private float packetLoss = -1f;

    private readonly StringBuilder stringBuilder = new(128);

    private void Update()
    {
        UpdateFPS();

        uiTimer += Time.unscaledDeltaTime;

        if (uiTimer >= uiInterval)
        {
            uiTimer = 0f;
            RefreshUI();
        }
    }

    /// <summary>
    /// FPS 统计
    /// </summary>
    private void UpdateFPS()
    {
        float deltaTime = Time.unscaledDeltaTime;

        elapsedTime += deltaTime;
        frameCount++;

        if (elapsedTime >= fpsInterval)
        {
            currentFps = frameCount / elapsedTime;
            currentFrameTime = elapsedTime / frameCount * 1000f;

            frameCount = 0;
            elapsedTime = 0f;
        }
    }

    /// <summary>
    /// 更新网络数据
    /// 由实际网络模块调用，不需要每帧调用
    /// </summary>
    public void SetNetworkStats(
        bool connected,
        int pingMs,
        float packetLossPercent)
    {
        isConnected = connected;
        ping = pingMs;
        packetLoss = packetLossPercent;
    }

    /// <summary>
    /// 刷新 UI
    /// </summary>
    private void RefreshUI()
    {
        if (infoText == null)
            return;

        stringBuilder.Clear();

        stringBuilder.Append("FPS: ");
        stringBuilder.Append(currentFps.ToString("F0"));

        stringBuilder.Append(" | Ping: ");

        if (isConnected && ping >= 0)
            stringBuilder.Append(ping).Append(" ms");
        else
            stringBuilder.Append("999ms");

        infoText.SetText(stringBuilder);
    }
}
