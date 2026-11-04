
using UnityEngine;
using UnityEngine.InputSystem;

public class CameraController : MonoBehaviour
{
    [Header("目标引用")]
    public Transform player;
    public Transform eyeAnchor;

    [Header("第三人称轨道参数")]
    public float thirdPersonDistance = 3.2f;
    public float heightOffset = 1.5f;

    [Header("视角控制")]
    public float mouseSensitivity = 0.1f;
    public float minPitch = -30f;
    public float maxPitch = 70f;

    [Header("平滑参数")]
    public float positionSmoothTime = 0.12f;

    [Tooltip("摄像机每秒最大旋转角度")]
    public float rotationSpeed = 360f;

    [Tooltip("忽略极小的鼠标输入")]
    public float mouseDeadZone = 0.01f;

    private bool _isFirstPerson = false;

    private float _yaw;
    private float _pitch;

    private Vector3 _positionVelocity;

    private Mouse _mouse;
    private Keyboard _keyboard;

    private void Start()
    {
        _mouse = Mouse.current;
        _keyboard = Keyboard.current;

        Vector3 angles = transform.eulerAngles;

        _yaw = angles.y;
        _pitch = angles.x;

        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    private void Update()
    {
        _mouse = Mouse.current;
        _keyboard = Keyboard.current;

        // V 键切换人称
        if (_keyboard != null && _keyboard.vKey.wasPressedThisFrame)
        {
            _isFirstPerson = !_isFirstPerson;
        }

        // 鼠标视角控制 
        if (_mouse != null &&
            Cursor.lockState == CursorLockMode.Locked)
        {
            Vector2 mouseDelta = _mouse.delta.ReadValue();

            // 过滤极小的鼠标输入
            if (mouseDelta.sqrMagnitude > mouseDeadZone * mouseDeadZone)
            {
                _yaw += mouseDelta.x * mouseSensitivity;
                _pitch -= mouseDelta.y * mouseSensitivity;

                _pitch = Mathf.Clamp(
                    _pitch,
                    minPitch,
                    maxPitch
                );
            }
        }

        // Esc 解锁鼠标
        if (_keyboard != null &&
            _keyboard.escapeKey.wasPressedThisFrame)
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        // 左键点击重新锁定鼠标
        if (_mouse != null &&
            _mouse.leftButton.wasPressedThisFrame &&
            Cursor.lockState == CursorLockMode.None)
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }
    }

    private void LateUpdate()
    {
        if (player == null) return;

        Quaternion targetRotation = Quaternion.Euler(
            _pitch,
            _yaw,
            0
        );

        Vector3 targetPosition;

        if (_isFirstPerson)
        {
            if (eyeAnchor == null) return;

            targetPosition = eyeAnchor.position;
        }
        else
        {
            Vector3 offset = new Vector3(
                0,
                heightOffset,
                -thirdPersonDistance
            );

            targetPosition =
                player.position + targetRotation * offset;
        }

        // 摄像机位置平滑跟随
        transform.position = Vector3.SmoothDamp(
            transform.position,
            targetPosition,
            ref _positionVelocity,
            positionSmoothTime
        );

        // 距离足够小时直接对齐，避免残余移动
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
}
