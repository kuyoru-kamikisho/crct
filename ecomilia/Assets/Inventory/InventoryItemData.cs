using UnityEngine;

[CreateAssetMenu(
    fileName = "NewItem",
    menuName = "Inventory/Item Data")]
public class InventoryItemData : ScriptableObject
{
    [Tooltip("唯一 ID，用于堆叠判断")]
    public string itemId;

    public string displayName;

    [TextArea]
    public string description;

    public Sprite icon;

    [Min(1)]
    public int maxStack = 99;

    [Tooltip("没有图标时格子显示的占位颜色")]
    public Color placeholderColor = new(0.45f, 0.7f, 0.95f, 1f);
}
