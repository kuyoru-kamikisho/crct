using System.Collections.Generic;
using UnityEngine;
#if UNITY_EDITOR
using UnityEditor;
using UnityEditorInternal;
#endif

/// <summary>
/// This component has no runtime functionality and simply holds references to specific assets or objects.
/// Useful for package export convenience, dependency tracking, and project organization.
/// </summary>
[AddComponentMenu("Utility/Just Reference Helper")]
[DisallowMultipleComponent]
public class JustReferenceHelper : MonoBehaviour
{
    [Tooltip("List of registered objects to reference (Text, Material, Prefab, Mesh, etc.)")]
    public List<Object> registeredObjectList = new List<Object>();

    [Tooltip("Total number of valid registered objects (automatically calculated)")]
    public int count;

    [TextArea(3, 6)]
    [Tooltip("Notes and descriptions for this reference helper")]
    public string memo;

    private void OnValidate()
    {
        UpdateCount();
    }

    /// <summary>
    /// Updates the total count of valid registered objects.
    /// </summary>
    public void UpdateCount()
    {
        int total = 0;
        if (registeredObjectList != null)
        {
            for (int i = 0; i < registeredObjectList.Count; i++)
            {
                if (registeredObjectList[i] != null)
                {
                    total++;
                }
            }
        }
        count = total;
    }
}

#if UNITY_EDITOR
[CustomEditor(typeof(JustReferenceHelper))]
[CanEditMultipleObjects]
public class JustReferenceHelperEditor : Editor
{
    private SerializedProperty registeredObjectListProp;
    private SerializedProperty countProp;
    private SerializedProperty memoProp;
    private ReorderableList reorderableList;

    private void OnEnable()
    {
        registeredObjectListProp = serializedObject.FindProperty("registeredObjectList");
        countProp = serializedObject.FindProperty("count");
        memoProp = serializedObject.FindProperty("memo");

        InitReorderableList();
    }

    private void InitReorderableList()
    {
        reorderableList = new ReorderableList(serializedObject, registeredObjectListProp, true, true, true, true);

        // Header label (always open, no toggle foldout)
        reorderableList.drawHeaderCallback = (Rect rect) =>
        {
            EditorGUI.LabelField(rect, "Registered Object List");
        };

        // Render each object slot
        reorderableList.drawElementCallback = (Rect rect, int index, bool isActive, bool isFocused) =>
        {
            if (index < 0 || index >= registeredObjectListProp.arraySize) return;

            SerializedProperty element = registeredObjectListProp.GetArrayElementAtIndex(index);
            rect.y += 2;
            rect.height = EditorGUIUtility.singleLineHeight;
            EditorGUI.PropertyField(rect, element, GUIContent.none);
        };
    }

    public override void OnInspectorGUI()
    {
        serializedObject.Update();

        var helper = (JustReferenceHelper)target;

        // Component purpose description banner
        EditorGUILayout.HelpBox("This component has no runtime functionality and simply holds references to specific assets or objects. It is intended for package export convenience and dependency tracking.", MessageType.Info);
        EditorGUILayout.Space(4);

        // 1. Registered Object List (Always open without foldout toggle)
        if (reorderableList == null)
        {
            InitReorderableList();
        }

        reorderableList.DoLayoutList();
        HandleDragAndDrop();

        EditorGUILayout.Space(4);

        // 2. Count (Read-only / automatically calculated)
        helper.UpdateCount();
        countProp.intValue = helper.count;
        GUI.enabled = false;
        EditorGUILayout.IntField(new GUIContent("Count"), countProp.intValue);
        GUI.enabled = true;

        EditorGUILayout.Space(4);

        // 3. Memo
        EditorGUILayout.PropertyField(memoProp, new GUIContent("Memo"));

        serializedObject.ApplyModifiedProperties();
    }

    /// <summary>
    /// Allows dragging and dropping multiple assets directly onto the list to add them quickly.
    /// </summary>
    private void HandleDragAndDrop()
    {
        Event evt = Event.current;
        Rect dropArea = GUILayoutUtility.GetLastRect();

        switch (evt.type)
        {
            case EventType.DragUpdated:
            case EventType.DragPerform:
                if (!dropArea.Contains(evt.mousePosition))
                    return;

                DragAndDrop.visualMode = DragAndDropVisualMode.Copy;

                if (evt.type == EventType.DragPerform)
                {
                    DragAndDrop.AcceptDrag();

                    foreach (Object draggedObj in DragAndDrop.objectReferences)
                    {
                        if (draggedObj == null) continue;

                        int newIndex = registeredObjectListProp.arraySize;
                        registeredObjectListProp.InsertArrayElementAtIndex(newIndex);
                        registeredObjectListProp.GetArrayElementAtIndex(newIndex).objectReferenceValue = draggedObj;
                    }
                    evt.Use();
                }
                break;
        }
    }
}
#endif
