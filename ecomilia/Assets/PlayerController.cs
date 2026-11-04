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
    [Tooltip("地面检测球半径")]
    public float groundCheckRadius = 0.2f;
    [Tooltip("地面检测点偏移（从角色中心向下）")]
    public float groundCheckOffset = 0.95f;
    [Tooltip("可站立的地面层级")]
    public LayerMask groundLayer;

    [Header("角色转向")]
    [Tooltip("转向平滑时间，值越小转向越快")]
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
        GroundCheck();
        HandleGravity();
        HandleMovementAndRotation();
        HandleJump();
    }

    private void GroundCheck()
    {
        Vector3 checkPoint = transform.position + Vector3.down * groundCheckOffset;
        _isGrounded = Physics.CheckSphere(checkPoint, groundCheckRadius, groundLayer, QueryTriggerInteraction.Ignore);
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

    private void HandleMovementAndRotation()
    {
        // 读取 WASD 输入
        Vector2 inputDir = Vector2.zero;
        if (_keyboard.wKey.isPressed) inputDir.y += 1f;
        if (_keyboard.sKey.isPressed) inputDir.y -= 1f;
        if (_keyboard.dKey.isPressed) inputDir.x += 1f;
        if (_keyboard.aKey.isPressed) inputDir.x -= 1f;
        inputDir.Normalize();

        if (inputDir.sqrMagnitude < 0.01f) return;

        // 计算基于相机朝向的移动方向
        Vector3 camForward = _mainCam.transform.forward;
        Vector3 camRight = _mainCam.transform.right;
        camForward.y = 0;
        camRight.y = 0;
        camForward.Normalize();
        camRight.Normalize();

        Vector3 moveDir = camForward * inputDir.y + camRight * inputDir.x;
        moveDir.Normalize();

        // 平滑转向
        float targetAngle = Mathf.Atan2(moveDir.x, moveDir.z) * Mathf.Rad2Deg;
        float smoothAngle = Mathf.SmoothDampAngle(transform.eulerAngles.y, targetAngle, ref _rotationVelocity, rotationSmoothTime);
        transform.rotation = Quaternion.Euler(0, smoothAngle, 0);

        // 执行移动
        Vector3 moveVelocity = moveDir * moveSpeed;
        moveVelocity.y = _verticalVelocity.y;
        _cc.Move(moveVelocity * Time.deltaTime);
    }

    private void HandleJump()
    {
        // 空格按下瞬间触发跳跃
        if (_keyboard.spaceKey.wasPressedThisFrame && _isGrounded)
        {
            _verticalVelocity.y = jumpForce;
        }
    }

    private void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.yellow;
        Vector3 checkPoint = transform.position + Vector3.down * groundCheckOffset;
        Gizmos.DrawWireSphere(checkPoint, groundCheckRadius);
    }
}
