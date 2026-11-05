
using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(CharacterController))]
public class PlayerController : MonoBehaviour
{
    [Header("移动参数")]
    [Tooltip("水平移动速度，单位：米/秒")]
    public float moveSpeed = 5.5f;

    [Tooltip("跳跃初速度")]
    public float jumpForce = 8f;

    [Tooltip("重力加速度")]
    public float gravity = -20f;

    [Header("地面检测")]
    public float groundCheckRadius = 0.2f;
    public float groundCheckOffset = 0.95f;
    public LayerMask groundLayer;

    [Header("角色转向")]
    public float rotationSmoothTime = 0.1f;

    private CharacterController _cc;

    private Vector3 _verticalVelocity;

    private bool _isGrounded;

    private float _rotationVelocity;

    private Transform _cameraTransform;

    private Keyboard _keyboard;

    private void Awake()
    {
        _cc = GetComponent<CharacterController>();

        _keyboard = Keyboard.current;

        Camera mainCamera = Camera.main;

        if (mainCamera != null)
        {
            _cameraTransform = mainCamera.transform;
        }
    }

    private void Update()
    {
        if (_keyboard == null)
            _keyboard = Keyboard.current;

        // 1. 地面检测
        GroundCheck();

        // 2. 跳跃处理
        HandleJump();

        // 3. 重力处理
        HandleGravity();

        // 4. 移动和转向
        HandleMovementAndRotation();
    }

    private void GroundCheck()
    {
        Vector3 feetPosition =
            transform.position +
            _cc.center -
            Vector3.up * (_cc.height * 0.5f);

        Vector3 checkPoint = feetPosition + Vector3.up * 0.05f;

        _isGrounded = Physics.CheckSphere(
            checkPoint,
            groundCheckRadius,
            groundLayer,
            QueryTriggerInteraction.Ignore
        );
    }

    private void HandleJump()
    {
        if (_keyboard == null)
            return;

        if (_keyboard.spaceKey.wasPressedThisFrame && _isGrounded)
        {
            _verticalVelocity.y = jumpForce;
        }
    }

    private void HandleGravity()
    {
        if (_isGrounded && _verticalVelocity.y < 0f)
        {
            _verticalVelocity.y = -2f;
        }
        else
        {
            _verticalVelocity.y += gravity * Time.deltaTime;
        }
    }

    private void HandleMovementAndRotation()
    {
        Vector2 inputDir = Vector2.zero;

        if (_keyboard != null)
        {
            if (_keyboard.wKey.isPressed) inputDir.y += 1f;
            if (_keyboard.sKey.isPressed) inputDir.y -= 1f;
            if (_keyboard.dKey.isPressed) inputDir.x += 1f;
            if (_keyboard.aKey.isPressed) inputDir.x -= 1f;
        }

        // 避免斜向移动速度超过正常移动速度
        inputDir = Vector2.ClampMagnitude(inputDir, 1f);

        Vector3 moveDir = Vector3.zero;

        if (inputDir.sqrMagnitude > 0.001f &&
            _cameraTransform != null)
        {
            Vector3 camForward = _cameraTransform.forward;
            Vector3 camRight = _cameraTransform.right;

            camForward.y = 0f;
            camRight.y = 0f;

            camForward.Normalize();
            camRight.Normalize();

            moveDir = camForward * inputDir.y +
                      camRight * inputDir.x;

            moveDir.Normalize();

            // 计算角色目标朝向
            float targetAngle = Mathf.Atan2(
                moveDir.x,
                moveDir.z
            ) * Mathf.Rad2Deg;

            float smoothAngle = Mathf.SmoothDampAngle(
                transform.eulerAngles.y,
                targetAngle,
                ref _rotationVelocity,
                rotationSmoothTime
            );

            transform.rotation = Quaternion.Euler(
                0f,
                smoothAngle,
                0f
            );
        }

        // 水平移动 + 垂直移动
        Vector3 velocity = moveDir * moveSpeed;

        velocity.y = _verticalVelocity.y;

        // 即使没有水平输入，也必须执行 Move
        _cc.Move(velocity * Time.deltaTime);
    }

    private void OnDrawGizmosSelected()
    {
        CharacterController cc = GetComponent<CharacterController>();

        if (cc == null)
            return;

        Vector3 feetPosition =
            transform.position +
            cc.center -
            Vector3.up * (cc.height * 0.5f);

        Vector3 checkPoint = feetPosition + Vector3.up * 0.05f;

        Gizmos.color = Color.yellow;

        Gizmos.DrawWireSphere(
            checkPoint,
            groundCheckRadius
        );
    }

    // 运行时更换摄像机时调用
    public void RefreshCamera()
    {
        Camera mainCamera = Camera.main;

        _cameraTransform = mainCamera != null
            ? mainCamera.transform
            : null;
    }
}
