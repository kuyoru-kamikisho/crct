using TMPro;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

/// <summary>
/// 左下角背包按钮 + 中央 2D 背包面板。运行时自动搭建 UI。
/// </summary>
public class InventoryUI : MonoBehaviour
{
    [Header("引用")]
    [SerializeField] private Inventory inventory;

    [Header("操作")]
    [Tooltip("打开/关闭背包快捷键")]
    [SerializeField] private Key toggleKey = Key.B;

    [Header("布局")]
    [SerializeField] private int gridColumns = 5;
    [SerializeField] private Vector2 slotSize = new(72f, 72f);
    [SerializeField] private float slotSpacing = 8f;

    private GameObject _panelRoot;
    private Button _bagButton;
    private TextMeshProUGUI _detailText;
    private Image[] _slotIcons;
    private TextMeshProUGUI[] _slotCounts;
    private Button[] _slotButtons;

    private int _selectedIndex = -1;
    private bool _isOpen;
    private Sprite _whiteSprite;
    private Keyboard _keyboard;

    public bool IsOpen => _isOpen;

    private void Awake()
    {
        _keyboard = Keyboard.current;
        _whiteSprite = CreateWhiteSprite();

        if (inventory == null)
        {
            GameObject player = GameObject.Find("Player");

            if (player == null)
            {
                try
                {
                    player = GameObject.FindGameObjectWithTag("Player");
                }
                catch (UnityException)
                {
                    // Player 标签未定义时忽略
                }
            }

            if (player != null)
            {
                inventory = player.GetComponent<Inventory>();

                if (inventory == null)
                    inventory = player.AddComponent<Inventory>();
            }
            else
            {
                inventory = FindFirstObjectByType<Inventory>();
            }
        }

        BuildUI();
        SetOpen(false);
    }

    private void OnEnable()
    {
        if (inventory != null)
            inventory.Changed += RefreshSlots;
    }

    private void OnDisable()
    {
        if (inventory != null)
            inventory.Changed -= RefreshSlots;

        if (_isOpen)
        {
            GameUIState.IsBlockingGameplay = false;
        }
    }

    private void Update()
    {
        if (_keyboard == null)
            _keyboard = Keyboard.current;

        if (_keyboard == null)
            return;

        if (_keyboard[toggleKey].wasPressedThisFrame)
        {
            Toggle();
            return;
        }

        if (_isOpen && _keyboard.escapeKey.wasPressedThisFrame)
        {
            SetOpen(false);
        }
    }

    public void Toggle()
    {
        SetOpen(!_isOpen);
    }

    public void SetOpen(bool open)
    {
        _isOpen = open;

        if (_panelRoot != null)
            _panelRoot.SetActive(open);

        GameUIState.IsBlockingGameplay = open;

        if (open)
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
            RefreshSlots();
            SelectSlot(-1);
        }
        else
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }
    }

    private void RefreshSlots()
    {
        if (inventory == null || _slotIcons == null)
            return;

        for (int i = 0; i < _slotIcons.Length; i++)
        {
            if (i >= inventory.Slots.Count)
            {
                ApplyEmptySlot(i);
                continue;
            }

            InventorySlot slot = inventory.Slots[i];

            if (slot.IsEmpty)
            {
                ApplyEmptySlot(i);
                continue;
            }

            InventoryItemData item = slot.item;

            if (item.icon != null)
            {
                _slotIcons[i].sprite = item.icon;
                _slotIcons[i].color = Color.white;
            }
            else
            {
                _slotIcons[i].sprite = _whiteSprite;
                _slotIcons[i].color = item.placeholderColor;
            }

            _slotIcons[i].enabled = true;
            _slotCounts[i].text = slot.count > 1
                ? slot.count.ToString()
                : string.Empty;
        }
    }

    private void ApplyEmptySlot(int index)
    {
        _slotIcons[index].sprite = null;
        _slotIcons[index].color = new Color(1f, 1f, 1f, 0.05f);
        _slotIcons[index].enabled = true;
        _slotCounts[index].text = string.Empty;
    }

    private void SelectSlot(int index)
    {
        _selectedIndex = index;

        if (_detailText == null)
            return;

        if (inventory == null ||
            index < 0 ||
            index >= inventory.Slots.Count ||
            inventory.Slots[index].IsEmpty)
        {
            _detailText.text = "选择一个物品查看详情";
            return;
        }

        InventorySlot slot = inventory.Slots[index];
        InventoryItemData item = slot.item;

        _detailText.text =
            $"<b>{item.displayName}</b>  x{slot.count}\n{item.description}";
    }

    private void BuildUI()
    {
        RectTransform canvasRect = transform as RectTransform;

        // ---- 左下角背包按钮 ----
        GameObject bagGo = CreateUiObject("BagButton", canvasRect);
        RectTransform bagRect = bagGo.GetComponent<RectTransform>();
        bagRect.anchorMin = new Vector2(0f, 0f);
        bagRect.anchorMax = new Vector2(0f, 0f);
        bagRect.pivot = new Vector2(0f, 0f);
        bagRect.anchoredPosition = new Vector2(24f, 24f);
        bagRect.sizeDelta = new Vector2(110f, 48f);

        Image bagImage = bagGo.AddComponent<Image>();
        bagImage.sprite = _whiteSprite;
        bagImage.color = new Color(0.12f, 0.14f, 0.18f, 0.92f);

        _bagButton = bagGo.AddComponent<Button>();
        _bagButton.targetGraphic = bagImage;
        _bagButton.onClick.AddListener(Toggle);

        TextMeshProUGUI bagLabel = CreateTmp(
            "Label",
            bagRect,
            "背包 (B)",
            22f,
            TextAlignmentOptions.Center
        );
        StretchFull(bagLabel.rectTransform);

        // ---- 中央面板 ----
        _panelRoot = CreateUiObject("InventoryPanel", canvasRect);
        RectTransform panelRect = _panelRoot.GetComponent<RectTransform>();
        panelRect.anchorMin = new Vector2(0.5f, 0.5f);
        panelRect.anchorMax = new Vector2(0.5f, 0.5f);
        panelRect.pivot = new Vector2(0.5f, 0.5f);
        panelRect.sizeDelta = new Vector2(520f, 560f);

        Image panelBg = _panelRoot.AddComponent<Image>();
        panelBg.sprite = _whiteSprite;
        panelBg.color = new Color(0.08f, 0.09f, 0.12f, 0.94f);

        // 标题
        TextMeshProUGUI title = CreateTmp(
            "Title",
            panelRect,
            "背包",
            30f,
            TextAlignmentOptions.Center
        );
        title.rectTransform.anchorMin = new Vector2(0f, 1f);
        title.rectTransform.anchorMax = new Vector2(1f, 1f);
        title.rectTransform.pivot = new Vector2(0.5f, 1f);
        title.rectTransform.anchoredPosition = new Vector2(0f, -16f);
        title.rectTransform.sizeDelta = new Vector2(-80f, 40f);

        // 关闭按钮
        GameObject closeGo = CreateUiObject("CloseButton", panelRect);
        RectTransform closeRect = closeGo.GetComponent<RectTransform>();
        closeRect.anchorMin = new Vector2(1f, 1f);
        closeRect.anchorMax = new Vector2(1f, 1f);
        closeRect.pivot = new Vector2(1f, 1f);
        closeRect.anchoredPosition = new Vector2(-12f, -12f);
        closeRect.sizeDelta = new Vector2(40f, 40f);

        Image closeImage = closeGo.AddComponent<Image>();
        closeImage.sprite = _whiteSprite;
        closeImage.color = new Color(0.35f, 0.2f, 0.2f, 1f);

        Button closeButton = closeGo.AddComponent<Button>();
        closeButton.targetGraphic = closeImage;
        closeButton.onClick.AddListener(() => SetOpen(false));

        TextMeshProUGUI closeLabel = CreateTmp(
            "X",
            closeRect,
            "X",
            24f,
            TextAlignmentOptions.Center
        );
        StretchFull(closeLabel.rectTransform);

        // 格子容器
        GameObject gridGo = CreateUiObject("SlotGrid", panelRect);
        RectTransform gridRect = gridGo.GetComponent<RectTransform>();
        gridRect.anchorMin = new Vector2(0.5f, 0.5f);
        gridRect.anchorMax = new Vector2(0.5f, 0.5f);
        gridRect.pivot = new Vector2(0.5f, 0.5f);
        gridRect.anchoredPosition = new Vector2(0f, 30f);

        int slotCount = inventory != null ? inventory.Capacity : 20;
        int rows = Mathf.CeilToInt(slotCount / (float)gridColumns);

        float gridWidth =
            gridColumns * slotSize.x +
            (gridColumns - 1) * slotSpacing;
        float gridHeight =
            rows * slotSize.y +
            (rows - 1) * slotSpacing;

        gridRect.sizeDelta = new Vector2(gridWidth, gridHeight);

        GridLayoutGroup grid = gridGo.AddComponent<GridLayoutGroup>();
        grid.cellSize = slotSize;
        grid.spacing = new Vector2(slotSpacing, slotSpacing);
        grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
        grid.constraintCount = gridColumns;
        grid.childAlignment = TextAnchor.UpperLeft;

        _slotIcons = new Image[slotCount];
        _slotCounts = new TextMeshProUGUI[slotCount];
        _slotButtons = new Button[slotCount];

        for (int i = 0; i < slotCount; i++)
        {
            int index = i;
            GameObject slotGo = CreateUiObject($"Slot_{i}", gridRect);

            Image slotBg = slotGo.AddComponent<Image>();
            slotBg.sprite = _whiteSprite;
            slotBg.color = new Color(0.18f, 0.2f, 0.25f, 1f);

            Button slotButton = slotGo.AddComponent<Button>();
            slotButton.targetGraphic = slotBg;
            slotButton.onClick.AddListener(() => SelectSlot(index));
            _slotButtons[i] = slotButton;

            GameObject iconGo = CreateUiObject("Icon", slotGo.transform);
            RectTransform iconRect = iconGo.GetComponent<RectTransform>();
            StretchFull(iconRect, 8f);

            Image icon = iconGo.AddComponent<Image>();
            icon.sprite = _whiteSprite;
            icon.preserveAspect = true;
            _slotIcons[i] = icon;

            TextMeshProUGUI countText = CreateTmp(
                "Count",
                slotGo.GetComponent<RectTransform>(),
                string.Empty,
                18f,
                TextAlignmentOptions.BottomRight
            );
            countText.rectTransform.anchorMin = Vector2.zero;
            countText.rectTransform.anchorMax = Vector2.one;
            countText.rectTransform.offsetMin = new Vector2(4f, 2f);
            countText.rectTransform.offsetMax = new Vector2(-4f, -2f);
            countText.fontStyle = FontStyles.Bold;
            _slotCounts[i] = countText;
        }

        // 详情
        _detailText = CreateTmp(
            "Detail",
            panelRect,
            "选择一个物品查看详情",
            18f,
            TextAlignmentOptions.TopLeft
        );
        _detailText.rectTransform.anchorMin = new Vector2(0f, 0f);
        _detailText.rectTransform.anchorMax = new Vector2(1f, 0f);
        _detailText.rectTransform.pivot = new Vector2(0.5f, 0f);
        _detailText.rectTransform.anchoredPosition = new Vector2(0f, 16f);
        _detailText.rectTransform.sizeDelta = new Vector2(-40f, 90f);
        _detailText.color = new Color(0.85f, 0.88f, 0.92f, 1f);

        RefreshSlots();
    }

    private static GameObject CreateUiObject(string name, Transform parent)
    {
        GameObject go = new(name);
        go.transform.SetParent(parent, false);
        go.AddComponent<RectTransform>();
        return go;
    }

    private static TextMeshProUGUI CreateTmp(
        string name,
        Transform parent,
        string text,
        float fontSize,
        TextAlignmentOptions alignment)
    {
        GameObject go = CreateUiObject(name, parent);
        TextMeshProUGUI tmp = go.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = fontSize;
        tmp.alignment = alignment;
        tmp.color = Color.white;
        tmp.raycastTarget = false;
        return tmp;
    }

    private static void StretchFull(RectTransform rect, float padding = 0f)
    {
        rect.anchorMin = Vector2.zero;
        rect.anchorMax = Vector2.one;
        rect.offsetMin = new Vector2(padding, padding);
        rect.offsetMax = new Vector2(-padding, -padding);
    }

    private static Sprite CreateWhiteSprite()
    {
        Texture2D texture = Texture2D.whiteTexture;
        return Sprite.Create(
            texture,
            new Rect(0f, 0f, texture.width, texture.height),
            new Vector2(0.5f, 0.5f),
            100f
        );
    }
}
