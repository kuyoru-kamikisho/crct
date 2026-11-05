
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

    private Camera _mainCam;
    private Keyboard _keyboard;

    private void Awake()
    {
        _cc = GetComponent<CharacterController>();
        _mainCam = Camera.main;
        _keyboard = Keyboard.current;
    }

    private void Update()
    {
        _keyboard = Keyboard.current;

        GroundCheck();

        HandleJump();
        HandleGravity();

        HandleMovementAndRotation();
    }

    private void GroundCheck()
    {
        // 获取角色胶囊体底部的世界坐标
        Vector3 feetPosition =
            transform.position +
            _cc.center -
            Vector3.up * _cc.height * 0.5f;

        // 将检测点稍微向上移动，避免完全位于地面以下
        Vector3 checkPoint = feetPosition + Vector3.up * 0.05f;

        _isGrounded = Physics.CheckSphere(
            checkPoint,
            groundCheckRadius,
            groundLayer,
            QueryTriggerInteraction.Ignore
        );
    }

    private void HandleGravity()
    {
        if (_isGrounded && _verticalVelocity.y < 0)
        {
            _verticalVelocity.y = -2f;
        }
        else
        {
            _verticalVelocity.y += gravity * Time.deltaTime;
        }
    }

    private void HandleJump()
    {
        if (_keyboard == null) return;

        if (_keyboard.spaceKey.wasPressedThisFrame)
        {
            Debug.Log($"按下空格，是否接触地面：{_isGrounded}");

            if (_isGrounded)
            {
                _verticalVelocity.y = jumpForce;
                Debug.Log("触发跳跃");
            }
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

        inputDir.Normalize();

        Vector3 moveDir = Vector3.zero;

        // 计算基于相机朝向的水平移动方向
        if (inputDir.sqrMagnitude > 0.01f && _mainCam != null)
        {
            Vector3 camForward = _mainCam.transform.forward;
            Vector3 camRight = _mainCam.transform.right;

            camForward.y = 0;
            camRight.y = 0;

            camForward.Normalize();
            camRight.Normalize();

            moveDir = camForward * inputDir.y + camRight * inputDir.x;
            moveDir.Normalize();

            // 只有存在水平输入时才转向
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

            transform.rotation = Quaternion.Euler(0, smoothAngle, 0);
        }

        // 水平移动 + 垂直移动
        // 关键：即使没有 WASD 输入，也必须执行 Move
        Vector3 moveVelocity = moveDir * moveSpeed;
        moveVelocity.y = _verticalVelocity.y;

        _cc.Move(moveVelocity * Time.deltaTime);
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;

        Vector3 checkPoint =
            transform.position + Vector3.down * groundCheckOffset;

        Gizmos.DrawWireSphere(checkPoint, groundCheckRadius);
    }
}
