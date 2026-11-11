
using UnityEngine;
using UnityEngine.InputSystem;

public class CameraController : MonoBehaviour
{
    [Header("目标引用")]
    public Transform player;
    public Transform eyeAnchor;

    [Header("第三人称轨道参数")]
    public float thirdPersonDistance = 5.5f;
    public float heightOffset = 0.36f;

    [Header("滚轮缩放")]
    [Tooltip("滚轮灵敏度；Windows 上滚轮一步通常约 120")]
    public float zoomSensitivity = 0.5f;

    [Tooltip("第三人称最近距离")]
    public float minDistance = 2f;

    [Tooltip("第三人称最远距离")]
    public float maxDistance = 12f;

    [Header("视角控制")]
    public float mouseSensitivity = 0.1f;
    public float minPitch = -30f;
    public float maxPitch = 70f;

    [Header("平滑参数")]
    public float positionSmoothTime = 0.12f;

    [Tooltip("摄像机每秒最大旋转角度")]
    public float rotationSpeed = 720f;

    [Tooltip("忽略极小的鼠标输入")]
    public float mouseDeadZone = 0.01f;

    private bool _isFirstPerson;

    private float _yaw;
    private float _pitch;

    private float _currentDistance;

    private Vector3 _positionVelocity;

    private Mouse _mouse;
    private Keyboard _keyboard;

    private Transform _playerTransform;
    private Transform _eyeTransform;

    private void Awake()
    {
        _mouse = Mouse.current;
        _keyboard = Keyboard.current;

        _playerTransform = player;
        _eyeTransform = eyeAnchor;

        _currentDistance = Mathf.Clamp(
            thirdPersonDistance,
            minDistance,
            maxDistance
        );
    }

    private void Start()
    {
        Vector3 angles = transform.eulerAngles;

        _yaw = angles.y;
        _pitch = Mathf.DeltaAngle(0f, angles.x);

        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    private void Update()
    {
        // 输入设备可能在运行期间发生变化
        if (_mouse == null)
            _mouse = Mouse.current;

        if (_keyboard == null)
            _keyboard = Keyboard.current;

        HandleInput();
    }

    private void HandleInput()
    {
        // 背包等 UI 打开时，不抢鼠标、不转视角
        if (GameUIState.IsBlockingGameplay)
            return;

        // V 键切换人称
        if (_keyboard != null && _keyboard.vKey.wasPressedThisFrame)
        {
            _isFirstPerson = !_isFirstPerson;
        }

        // 鼠标视角控制
        if (_mouse != null && Cursor.lockState == CursorLockMode.Locked)
        {
            Vector2 delta = _mouse.delta.ReadValue();

            if (delta.sqrMagnitude > mouseDeadZone * mouseDeadZone)
            {
                _yaw += delta.x * mouseSensitivity;
                _pitch -= delta.y * mouseSensitivity;

                _pitch = Mathf.Clamp(_pitch, minPitch, maxPitch);
            }
        }

        HandleZoom();

        // Esc 解锁鼠标
        if (_keyboard != null && _keyboard.escapeKey.wasPressedThisFrame)
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        // 左键重新锁定鼠标（点在 UI 上时不锁定）
        if (_mouse != null &&
            _mouse.leftButton.wasPressedThisFrame &&
            Cursor.lockState == CursorLockMode.None &&
            !IsPointerOverUI())
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }
    }

    private static bool IsPointerOverUI()
    {
        var eventSystem = UnityEngine.EventSystems.EventSystem.current;

        return eventSystem != null &&
               eventSystem.IsPointerOverGameObject();
    }

    private void HandleZoom()
    {
        // 第一人称不需要拉远近
        if (_isFirstPerson || _mouse == null)
            return;

        float scroll = _mouse.scroll.ReadValue().y;

        if (Mathf.Abs(scroll) < 0.01f)
            return;

        _currentDistance -= scroll * zoomSensitivity;
        _currentDistance = Mathf.Clamp(
            _currentDistance,
            minDistance,
            maxDistance
        );
        thirdPersonDistance = _currentDistance;
    }

    private void LateUpdate()
    {
        if (_playerTransform == null)
            return;

        Quaternion targetRotation = Quaternion.Euler(
            _pitch,
            _yaw,
            0f
        );

        Vector3 targetPosition;

        if (_isFirstPerson)
        {
            if (_eyeTransform == null)
                return;

            targetPosition = _eyeTransform.position;
        }
        else
        {
            Vector3 offset = targetRotation * new Vector3(
                0f,
                heightOffset,
                -_currentDistance
            );

            targetPosition = _playerTransform.position + offset;
        }

        // 摄像机位置平滑跟随
        transform.position = Vector3.SmoothDamp(
            transform.position,
            targetPosition,
            ref _positionVelocity,
            positionSmoothTime
        );

        // 消除极小的残余位置误差
        if ((transform.position - targetPosition).sqrMagnitude < 0.000001f)
        {
            transform.position = targetPosition;
            _positionVelocity = Vector3.zero;
        }

        // 摄像机旋转平滑跟随
        transform.rotation = Quaternion.RotateTowards(
            transform.rotation,
            targetRotation,
            rotationSpeed * Time.deltaTime
        );
    }

    // 如果运行时更换目标，可以调用此方法更新引用
    public void RefreshTargets()
    {
        _playerTransform = player;
        _eyeTransform = eyeAnchor;
    }
}
