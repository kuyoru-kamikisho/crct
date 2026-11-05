
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

        stringBuilder.Append("FPS: ");
        stringBuilder.Append(currentFps.ToString("F0"));

        stringBuilder.Append(" | Ping: ");

        if (currentPing >= 0)
            stringBuilder.Append(currentPing).Append(" ms");
        else
            stringBuilder.Append("--");

        infoText.SetText(stringBuilder);
    }
}
