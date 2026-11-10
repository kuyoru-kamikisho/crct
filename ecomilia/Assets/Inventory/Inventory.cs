using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class InventorySlot
{
    public InventoryItemData item;
    public int count;

    public bool IsEmpty => item == null || count <= 0;
}

/// <summary>
/// 角色背包数据：增删物品，并通知 UI 刷新。
/// </summary>
public class Inventory : MonoBehaviour
{
    [Header("容量")]
    [SerializeField] private int capacity = 20;

    [Header("开局示例物品（可在 Inspector 配置）")]
    [SerializeField] private List<StartingItem> startingItems = new();

    private readonly List<InventorySlot> _slots = new();

    public IReadOnlyList<InventorySlot> Slots => _slots;

    public int Capacity => capacity;

    public event Action Changed;

    [Serializable]
    private struct StartingItem
    {
        public InventoryItemData item;
        public int count;
    }

    private void Awake()
    {
        for (int i = 0; i < capacity; i++)
        {
            _slots.Add(new InventorySlot());
        }

        bool addedAny = false;

        foreach (StartingItem starting in startingItems)
        {
            if (starting.item == null || starting.count <= 0)
                continue;

            TryAdd(starting.item, starting.count);
            addedAny = true;
        }

        // 未配置开局物品时，放入几件演示道具，方便马上看到效果
        if (!addedAny)
        {
            SeedDemoItems();
        }
    }

    private void SeedDemoItems()
    {
        TryAdd(CreateRuntimeItem(
            "herb",
            "草药",
            "常见的疗伤草药，也许能用来制作药剂。",
            new Color(0.35f, 0.75f, 0.4f)), 3);

        TryAdd(CreateRuntimeItem(
            "potion",
            "小型药水",
            "清澈的红色药剂，喝下后能恢复一些体力。",
            new Color(0.9f, 0.3f, 0.35f)), 2);

        TryAdd(CreateRuntimeItem(
            "key",
            "旧钥匙",
            "一把锈迹斑斑的钥匙，似乎能打开某处的门。",
            new Color(0.9f, 0.75f, 0.25f)), 1);

        TryAdd(CreateRuntimeItem(
            "wood",
            "木材",
            "砍伐得来的普通木材，可用于简易建造。",
            new Color(0.55f, 0.38f, 0.22f)), 8);
    }

    private static InventoryItemData CreateRuntimeItem(
        string id,
        string displayName,
        string description,
        Color color)
    {
        InventoryItemData item = ScriptableObject.CreateInstance<InventoryItemData>();
        item.itemId = id;
        item.displayName = displayName;
        item.description = description;
        item.placeholderColor = color;
        item.maxStack = 99;
        return item;
    }

    public bool TryAdd(InventoryItemData item, int amount = 1)
    {
        if (item == null || amount <= 0)
            return false;

        int remaining = amount;

        // 先填已有堆叠
        for (int i = 0; i < _slots.Count && remaining > 0; i++)
        {
            InventorySlot slot = _slots[i];

            if (slot.IsEmpty || slot.item.itemId != item.itemId)
                continue;

            int canAdd = Mathf.Min(
                remaining,
                item.maxStack - slot.count
            );

            if (canAdd <= 0)
                continue;

            slot.count += canAdd;
            remaining -= canAdd;
        }

        // 再找空格
        for (int i = 0; i < _slots.Count && remaining > 0; i++)
        {
            InventorySlot slot = _slots[i];

            if (!slot.IsEmpty)
                continue;

            int put = Mathf.Min(remaining, item.maxStack);
            slot.item = item;
            slot.count = put;
            remaining -= put;
        }

        if (remaining < amount)
        {
            Changed?.Invoke();
        }

        return remaining == 0;
    }

    public bool TryRemove(string itemId, int amount = 1)
    {
        if (string.IsNullOrEmpty(itemId) || amount <= 0)
            return false;

        int owned = CountItem(itemId);

        if (owned < amount)
            return false;

        int remaining = amount;

        for (int i = _slots.Count - 1; i >= 0 && remaining > 0; i--)
        {
            InventorySlot slot = _slots[i];

            if (slot.IsEmpty || slot.item.itemId != itemId)
                continue;

            int take = Mathf.Min(remaining, slot.count);
            slot.count -= take;
            remaining -= take;

            if (slot.count <= 0)
            {
                slot.item = null;
                slot.count = 0;
            }
        }

        Changed?.Invoke();
        return true;
    }

    public int CountItem(string itemId)
    {
        int total = 0;

        foreach (InventorySlot slot in _slots)
        {
            if (!slot.IsEmpty && slot.item.itemId == itemId)
                total += slot.count;
        }

        return total;
    }
}
