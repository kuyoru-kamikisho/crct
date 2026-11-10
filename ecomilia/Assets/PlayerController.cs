
using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(CharacterController))]
public class PlayerController : MonoBehaviour
{
    [Header("移动参数")]
    [Tooltip("正常移动速度，单位：米/秒")]
    public float moveSpeed = 5.5f;

    [Tooltip("跑步速度倍率")]
    public float sprintMultiplier = 2.2f;

    [Tooltip("跳跃初速度")]
    public float jumpForce = 8f;

    [Tooltip("重力加速度")]
    public float gravity = -20f;

    [Header("冲刺参数")]
    [Tooltip("冲刺距离，单位：米")]
    public float dashDistance = 5f;

    [Tooltip("冲刺持续时间，单位：秒")]
    public float dashDuration = 0.2f;

    [Header("持续跑步参数")]
    [Tooltip("按住 Shift 多久后进入持续跑步状态")]
    public float sprintLockTime = 2f;

    [Header("地面检测")]
    public float groundCheckRadius = 0.2f;
    public LayerMask groundLayer;

    [Header("角色转向")]
    public float rotationSmoothTime = 0.1f;

    [Header("动画参数阈值")]
    [Tooltip("走路时传给 Animator 的 Speed，需大于 Idle→Walk 阈值(0.1)")]
    public float walkAnimSpeed = 0.5f;

    [Tooltip("跑步/冲刺时传给 Animator 的 Speed，需大于 Walk→Run 阈值(0.6)")]
    public float runAnimSpeed = 1f;

    private CharacterController _cc;

    private Animator _animator;

    private Vector3 _verticalVelocity;

    private bool _isGrounded;

    private float _rotationVelocity;

    private Transform _cameraTransform;

    private Keyboard _keyboard;

    // Shift 状态
    private bool _isShiftHeld;

    // 是否已经进入持续跑步状态
    private bool _isSprintLocked;

    // Shift 按住时间
    private float _sprintHoldTimer;

    // 冲刺状态
    private bool _isDashing;

    private float _dashTimer;

    private Vector3 _dashDirection;

    private static readonly int SpeedHash = Animator.StringToHash("Speed");
    private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
    private static readonly int JumpHash = Animator.StringToHash("Jump");

    private void Awake()
    {
        _cc = GetComponent<CharacterController>();
        _animator = GetComponentInChildren<Animator>();

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

        // 背包等 UI 打开时暂停角色操控
        if (GameUIState.IsBlockingGameplay)
            return;

        // 1. 地面检测
        GroundCheck();

        // 2. 获取移动输入
        Vector2 inputDir = GetMovementInput();

        // 3. 计算移动方向
        Vector3 moveDir = GetCameraRelativeDirection(inputDir);

        bool isMoving = moveDir.sqrMagnitude > 0.001f;

        // 4. 处理 Shift、跑步和冲刺
        HandleSprint(isMoving, moveDir);

        // 5. 跳跃
        HandleJump();

        // 6. 重力
        HandleGravity();

        // 7. 移动和转向
        HandleMovement(moveDir, isMoving);

        // 8. 同步动画参数
        UpdateAnimator(isMoving);
    }

    private Vector2 GetMovementInput()
    {
        Vector2 inputDir = Vector2.zero;

        if (_keyboard == null)
            return inputDir;

        if (_keyboard.wKey.isPressed) inputDir.y += 1f;
        if (_keyboard.sKey.isPressed) inputDir.y -= 1f;
        if (_keyboard.dKey.isPressed) inputDir.x += 1f;
        if (_keyboard.aKey.isPressed) inputDir.x -= 1f;

        return Vector2.ClampMagnitude(inputDir, 1f);
    }

    private Vector3 GetCameraRelativeDirection(Vector2 inputDir)
    {
        if (inputDir.sqrMagnitude < 0.001f ||
            _cameraTransform == null)
        {
            return Vector3.zero;
        }

        Vector3 camForward = _cameraTransform.forward;
        Vector3 camRight = _cameraTransform.right;

        camForward.y = 0f;
        camRight.y = 0f;

        camForward.Normalize();
        camRight.Normalize();

        Vector3 moveDir =
            camForward * inputDir.y +
            camRight * inputDir.x;

        return moveDir.normalized;
    }

    private void HandleSprint(bool isMoving, Vector3 moveDir)
    {
        if (_keyboard == null)
            return;

        _isShiftHeld =
            _keyboard.leftShiftKey.isPressed ||
            _keyboard.rightShiftKey.isPressed;

        // 停止移动后重置持续跑步状态
        if (!isMoving)
        {
            _sprintHoldTimer = 0f;
            _isSprintLocked = false;
            _isDashing = false;

            return;
        }

        // Shift 按下瞬间触发冲刺
        if (_keyboard.leftShiftKey.wasPressedThisFrame ||
            _keyboard.rightShiftKey.wasPressedThisFrame)
        {
            _isDashing = true;

            _dashTimer = dashDuration;

            // 锁定冲刺开始时的移动方向
            _dashDirection = moveDir;
        }

        // 按住 Shift 且持续移动，累计跑步时间
        if (_isShiftHeld)
        {
            _sprintHoldTimer += Time.deltaTime;

            if (_sprintHoldTimer >= sprintLockTime)
            {
                _isSprintLocked = true;
            }
        }
        else if (!_isSprintLocked)
        {
            // 未达到两秒就松开 Shift，取消累计时间
            _sprintHoldTimer = 0f;
        }
    }

    private float GetCurrentMoveSpeed()
    {
        // 按住 Shift 或进入持续跑步状态
        if (_isShiftHeld || _isSprintLocked)
        {
            return moveSpeed * sprintMultiplier;
        }

        return moveSpeed;
    }

    private void HandleMovement(Vector3 moveDir, bool isMoving)
    {
        // 角色转向
        if (isMoving)
        {
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

        // 普通移动或跑步
        float currentSpeed = GetCurrentMoveSpeed();

        Vector3 horizontalVelocity = moveDir * currentSpeed;

        // 冲刺期间覆盖普通水平速度
        if (_isDashing)
        {
            if (dashDuration > 0f && _dashTimer > 0f)
            {
                float dashSpeed = dashDistance / dashDuration;

                horizontalVelocity = _dashDirection * dashSpeed;

                _dashTimer -= Time.deltaTime;
            }
            else
            {
                _isDashing = false;
            }
        }

        // 合并垂直速度
        horizontalVelocity.y = _verticalVelocity.y;

        // 执行移动和碰撞检测
        _cc.Move(horizontalVelocity * Time.deltaTime);
    }

    private void GroundCheck()
    {
        Vector3 feetPosition =
            transform.position +
            _cc.center -
            Vector3.up * _cc.height * 0.5f;

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

            if (_animator != null)
            {
                _animator.SetTrigger(JumpHash);
            }
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

    private void UpdateAnimator(bool isMoving)
    {
        if (_animator == null)
            return;

        float animSpeed = 0f;

        if (isMoving || _isDashing)
        {
            bool isRunning =
                _isDashing ||
                _isShiftHeld ||
                _isSprintLocked;

            animSpeed = isRunning ? runAnimSpeed : walkAnimSpeed;
        }

        _animator.SetFloat(SpeedHash, animSpeed);
        _animator.SetBool(IsGroundedHash, _isGrounded);
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

    public void RefreshCamera()
    {
        Camera mainCamera = Camera.main;

        _cameraTransform = mainCamera != null
            ? mainCamera.transform
            : null;
    }
}
