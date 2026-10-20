using UnityEngine;

public class Fractal : MonoBehaviour
{
	struct FractalPart {
		public Vector3 direction;
		public Quaternion rotation;
		public Transform transform;
	}
    
    [SerializeField, Range(1, 8)]
    int depth = 3;

    [SerializeField, Range(0f, 180f)]
    float rotationSpeed = 45f;
    
    [SerializeField]
	Mesh mesh;

	[SerializeField]
	Material material;

    FractalPart[][] parts;

	static Vector3[] directions = {
		Vector3.up, Vector3.right, Vector3.left, Vector3.forward, Vector3.back
	};

	static Quaternion[] rotations = {
		Quaternion.identity,
		Quaternion.Euler(0f, 0f, -90f), Quaternion.Euler(0f, 0f, 90f),
		Quaternion.Euler(90f, 0f, 0f), Quaternion.Euler(-90f, 0f, 0f)
	};
    
    FractalPart CreatePart (int levelIndex, int childIndex, float scale) {
		var go = new GameObject("Fractal Part L" + levelIndex + " C" + childIndex);
		go.transform.localScale = scale * Vector3.one;
        go.AddComponent<MeshFilter>().mesh = mesh;
        go.AddComponent<MeshRenderer>().material = material;

        return new FractalPart {
			direction = directions[childIndex%5],
			rotation = rotations[childIndex%3],
			transform = go.transform
		};
	}

    void Awake () {
        // 开辟了depth块内存
        parts = new FractalPart[depth][];
        // 每块内存按顺序容纳的大小是 5的(depth-1)次方
		for (int i = 0, length = 1; i < parts.Length; i++, length *= 5) {
			parts[i] = new FractalPart[length];
		}

		float scale = 1f;
        // 初始层级只能塞一个球
		parts[0][0] = CreatePart(0, 0, scale);

        // 0位已被占用，从1位开始
		for (int li = 1; li < parts.Length; li++) {
            scale *= 0.5f;
            // 指向父级
			FractalPart[] parentParts = parts[li - 1];
            // 指向本级，本级长度位 5的(li)次方
			FractalPart[] levelParts = parts[li];
            
            for (int fpi = 0; fpi < levelParts.Length; fpi ++){
                // 获取父级的transform
				Transform parentTransform = parentParts[fpi / 5].transform;
                // 子级的下标对象，尚未进行初始化，为null
				FractalPart part = levelParts[fpi] = CreatePart(li, fpi, scale);
                part.transform.localRotation =
					parentTransform.localRotation * part.rotation;
                part.transform.localPosition =
					parentTransform.localPosition +
					parentTransform.localRotation *
						(1.5f * part.transform.localScale.x * part.direction);
			}
		}
	}

    void Update () {
        Quaternion deltaRotation = Quaternion.Euler(0f, rotationSpeed * Time.deltaTime, 0f);
        FractalPart rootPart = parts[0][0];
		rootPart.rotation *= deltaRotation;
		rootPart.transform.localRotation = rootPart.rotation;
		parts[0][0] = rootPart;

        float scale = 1f;
        for (int li = 1; li < parts.Length; li++) {
            scale *= 0.5f;
			FractalPart[] parentParts = parts[li - 1];
			FractalPart[] levelParts = parts[li];
            
            for (int fpi = 0; fpi < levelParts.Length; fpi++) {
				Transform parentTransform = parentParts[fpi / 5].transform;
				FractalPart part = levelParts[fpi];
				part.rotation *= deltaRotation;
				part.transform.localRotation =
					parentTransform.localRotation * part.rotation;
				part.transform.localPosition =
					parentTransform.localPosition +
					parentTransform.localRotation *
						(1.5f * part.transform.localScale.x * part.direction);
				levelParts[fpi] = part;
			}
		}
	}
	// Fractal CreateChild (Vector3 direction, Quaternion rotation) {
	// 	Fractal child = Instantiate(this);
	// 	child.depth = depth - 1;
	// 	child.transform.localPosition = 0.75f * direction;
	// 	child.transform.localRotation = rotation;
	// 	child.transform.localScale = 0.5f * Vector3.one;
	// 	return child;
	// }

    // void Start () {
	// 	name = "Fractal " + depth;

	// 	if (depth <= 1) {
	// 		return;
	// 	}

	// 	Fractal childA = CreateChild(Vector3.up, Quaternion.identity);
	// 	Fractal childB = CreateChild(Vector3.right, Quaternion.Euler(0f, 0f, -90f));
	// 	Fractal childC = CreateChild(Vector3.left, Quaternion.Euler(0f, 0f, 90f));
	// 	Fractal childD = CreateChild(Vector3.forward, Quaternion.Euler(90f, 0f, 0f));
	// 	Fractal childE = CreateChild(Vector3.back, Quaternion.Euler(-90f, 0f, 0f));

	// 	childA.transform.SetParent(transform, false);
	// 	childB.transform.SetParent(transform, false);
	// 	childC.transform.SetParent(transform, false);
	// 	childD.transform.SetParent(transform, false);
	// 	childE.transform.SetParent(transform, false);
	// }

    // void Update () {
	// 	transform.Rotate(0f, 22.5f * Time.deltaTime, 0f);
	// }
}
