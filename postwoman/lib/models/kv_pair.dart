class KvPair {
  static int _seq = 0;

  final String id;
  String key;
  String value;
  bool enabled;

  KvPair({
    String? id,
    this.key = '',
    this.value = '',
    this.enabled = true,
  }) : id = id ?? '${++_seq}';

  KvPair copy() => KvPair(key: key, value: value, enabled: enabled);

  Map<String, dynamic> toJson() => {
        'key': key,
        'value': value,
        'enabled': enabled,
      };

  factory KvPair.fromJson(Map<String, dynamic> json) => KvPair(
        key: json['key'] as String? ?? '',
        value: json['value'] as String? ?? '',
        enabled: json['enabled'] as bool? ?? true,
      );
}
