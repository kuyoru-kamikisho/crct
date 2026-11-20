using UnityEngine;

[ExecuteAlways]
public class SnapBoxToGround : MonoBehaviour
{
    public float groundY = 0f;

    void LateUpdate()
    {
        Vector3 p = transform.position;
        p.y = groundY + transform.localScale.y * 0.5f;
        transform.position = p;
    }
}