import 'package:flutter/material.dart';

import '../models/kv_pair.dart';

class KvEditor extends StatefulWidget {
  final List<KvPair> items;
  final String keyHint;
  final String valueHint;
  final VoidCallback? onChanged;

  const KvEditor({
    super.key,
    required this.items,
    this.keyHint = '键',
    this.valueHint = '值',
    this.onChanged,
  });

  @override
  State<KvEditor> createState() => _KvEditorState();
}

class _KvEditorState extends State<KvEditor> {
  void _notify() => widget.onChanged?.call();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            itemCount: widget.items.length,
            itemBuilder: (context, index) {
              final item = widget.items[index];
              return _KvRow(
                key: ValueKey(item.id),
                pair: item,
                keyHint: widget.keyHint,
                valueHint: widget.valueHint,
                onChanged: _notify,
                onDelete: () {
                  setState(() {
                    if (widget.items.length == 1) {
                      item.key = '';
                      item.value = '';
                      item.enabled = true;
                    } else {
                      widget.items.removeAt(index);
                    }
                  });
                  _notify();
                },
              );
            },
          ),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () {
              setState(() => widget.items.add(KvPair()));
              _notify();
            },
            icon: const Icon(Icons.add, size: 18),
            label: const Text('添加一行'),
          ),
        ),
      ],
    );
  }
}

class _KvRow extends StatefulWidget {
  final KvPair pair;
  final String keyHint;
  final String valueHint;
  final VoidCallback onChanged;
  final VoidCallback onDelete;

  const _KvRow({
    super.key,
    required this.pair,
    required this.keyHint,
    required this.valueHint,
    required this.onChanged,
    required this.onDelete,
  });

  @override
  State<_KvRow> createState() => _KvRowState();
}

class _KvRowState extends State<_KvRow> {
  late final TextEditingController _key;
  late final TextEditingController _value;

  @override
  void initState() {
    super.initState();
    _key = TextEditingController(text: widget.pair.key);
    _value = TextEditingController(text: widget.pair.value);
  }

  @override
  void didUpdateWidget(covariant _KvRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.pair.id != widget.pair.id) {
      _key.text = widget.pair.key;
      _value.text = widget.pair.value;
    }
  }

  @override
  void dispose() {
    _key.dispose();
    _value.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Checkbox(
            value: widget.pair.enabled,
            visualDensity: VisualDensity.compact,
            onChanged: (v) {
              setState(() => widget.pair.enabled = v ?? true);
              widget.onChanged();
            },
          ),
          Expanded(
            flex: 2,
            child: TextField(
              controller: _key,
              decoration: InputDecoration(hintText: widget.keyHint),
              onChanged: (v) {
                widget.pair.key = v;
                widget.onChanged();
              },
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 3,
            child: TextField(
              controller: _value,
              decoration: InputDecoration(hintText: widget.valueHint),
              onChanged: (v) {
                widget.pair.value = v;
                widget.onChanged();
              },
            ),
          ),
          IconButton(
            tooltip: '删除',
            onPressed: widget.onDelete,
            icon: const Icon(Icons.close, size: 18),
          ),
        ],
      ),
    );
  }
}
