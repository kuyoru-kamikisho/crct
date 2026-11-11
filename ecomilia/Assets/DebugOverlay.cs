
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
    [SerializeField] private float pingInterval = 3f;

    private int frameCount;
    private float elapsedTime;
    private float currentFps;

    private float uiTimer;
    private float pingTimer;

    private int currentPing = -1;
    private UnityEngine.Ping networkPing;

    private readonly StringBuilder stringBuilder = new(64);

    private void Update()
    {
        UpdateFPS();
        UpdatePing();

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
        elapsedTime += Time.unscaledDeltaTime;
        frameCount++;

        if (elapsedTime >= fpsInterval)
        {
            currentFps = frameCount / elapsedTime;

            frameCount = 0;
            elapsedTime = 0f;
        }
    }

    /// <summary>
    /// 网络延迟检测
    /// </summary>
    private void UpdatePing()
    {
        if (networkPing != null)
        {
            if (!networkPing.isDone)
                return;

            currentPing = networkPing.time;

            Debug.Log($"[DebugOverlay] Ping completed: {currentPing}ms");

            if (currentPing < 0)
                Debug.LogWarning("[DebugOverlay] Ping failed!");

            networkPing = null;
        }

        pingTimer += Time.unscaledDeltaTime;

        if (pingTimer >= pingInterval)
        {
            pingTimer = 0f;

            Debug.Log("[DebugOverlay] Start Ping...");

            // 使用IP作为目标
            networkPing = new UnityEngine.Ping("59.82.121.163");
        }
    }

    /// <summary>
    /// 刷新 UI
    /// </summary>
    private void RefreshUI()
    {
        if (infoText == null)
            return;

        stringBuilder.Clear();

        // FPS 颜色
        string fpsColor = currentFps > 45 ? "#00FF00" : "#FFA500";

        // Ping 颜色
        string pingColor;

        if (currentPing < 0)
            pingColor = "#FFFFFF";
        else if (currentPing < 50)
            pingColor = "#00FF00";
        else if (currentPing < 120)
            pingColor = "#FFA500";
        else
            pingColor = "#FF0000";

        // FPS
        stringBuilder.Append("FPS: <color=");
        stringBuilder.Append(fpsColor);
        stringBuilder.Append(">");
        stringBuilder.Append(currentFps.ToString("F0"));
        stringBuilder.Append("</color>");

        // 分隔符
        stringBuilder.Append(" | Ping: ");

        // Ping
        if (currentPing >= 0)
        {
            stringBuilder.Append("<color=");
            stringBuilder.Append(pingColor);
            stringBuilder.Append(">");
            stringBuilder.Append(currentPing);
            stringBuilder.Append(" ms</color>");
        }
        else
        {
            stringBuilder.Append("--");
        }

        infoText.SetText(stringBuilder);
    }
}
