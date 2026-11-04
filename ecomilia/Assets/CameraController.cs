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
    public float rotationSmoothTime = 0.08f;

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
        // V 键切换人称
        if (_keyboard.vKey.wasPressedThisFrame)
        {
            _isFirstPerson = !_isFirstPerson;
        }

        // 鼠标视角控制 
        if (Cursor.lockState == CursorLockMode.Locked)
        {
            Vector2 mouseDelta = _mouse.delta.ReadValue();
            _yaw += mouseDelta.x * mouseSensitivity;
            _pitch -= mouseDelta.y * mouseSensitivity;
            _pitch = Mathf.Clamp(_pitch, minPitch, maxPitch);
        }

        // Esc 解锁鼠标
        if (_keyboard.escapeKey.wasPressedThisFrame)
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        // 左键点击重新锁定鼠标
        if (_mouse.leftButton.wasPressedThisFrame && Cursor.lockState == CursorLockMode.None)
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }
    }

    private void LateUpdate()
    {
        Quaternion targetRotation = Quaternion.Euler(_pitch, _yaw, 0);
        Vector3 targetPosition;

        if (_isFirstPerson)
        {
            targetPosition = eyeAnchor.position;
        }
        else
        {
            Vector3 offset = new Vector3(0, heightOffset, -thirdPersonDistance);
            targetPosition = player.position + targetRotation * offset;
        }

        transform.position = Vector3.SmoothDamp(transform.position, targetPosition, ref _positionVelocity, positionSmoothTime);
        transform.rotation = Quaternion.Lerp(transform.rotation, targetRotation, 1 - Mathf.Exp(-rotationSmoothTime * Time.deltaTime));
    }
}
