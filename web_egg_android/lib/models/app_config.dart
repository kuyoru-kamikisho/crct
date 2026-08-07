/// WebEgg 应用配置模型，持久化为 config.json。
class AppConfig {
  AppConfig({
    this.projectName = '',
    this.projectId = '',
    this.projectUrl = '',
    this.logPath = '',
    this.fullscreen = false,
    this.extraInfo = '',
    this.updateUrl = '',
    this.userAgent = '',
    this.allowMixedContent = true,
    this.cacheEnabled = true,
    this.keepScreenOn = false,
    this.hardwareBackAction = 'webBack',
    this.bridgeSecret = '',
  });

  String projectName;
  String projectId;
  String projectUrl;

  /// 为空时使用应用文档目录下的 logs/
  String logPath;
  bool fullscreen;
  String extraInfo;
  String updateUrl;
  String userAgent;
  bool allowMixedContent;
  bool cacheEnabled;
  bool keepScreenOn;

  /// exit | webBack | ignore
  String hardwareBackAction;
  String bridgeSecret;

  static const hardwareBackActions = ['exit', 'webBack', 'ignore'];

  factory AppConfig.fromJson(Map<String, dynamic> json) {
    return AppConfig(
      projectName: json['projectName'] as String? ?? '',
      projectId: json['projectId'] as String? ?? '',
      projectUrl: json['projectUrl'] as String? ?? '',
      logPath: json['logPath'] as String? ?? '',
      fullscreen: json['fullscreen'] as bool? ?? false,
      extraInfo: json['extraInfo'] as String? ?? '',
      updateUrl: json['updateUrl'] as String? ?? '',
      userAgent: json['userAgent'] as String? ?? '',
      allowMixedContent: json['allowMixedContent'] as bool? ?? true,
      cacheEnabled: json['cacheEnabled'] as bool? ?? true,
      keepScreenOn: json['keepScreenOn'] as bool? ?? false,
      hardwareBackAction: json['hardwareBackAction'] as String? ?? 'webBack',
      bridgeSecret: json['bridgeSecret'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'projectName': projectName,
        'projectId': projectId,
        'projectUrl': projectUrl,
        'logPath': logPath,
        'fullscreen': fullscreen,
        'extraInfo': extraInfo,
        'updateUrl': updateUrl,
        'userAgent': userAgent,
        'allowMixedContent': allowMixedContent,
        'cacheEnabled': cacheEnabled,
        'keepScreenOn': keepScreenOn,
        'hardwareBackAction': hardwareBackAction,
        'bridgeSecret': bridgeSecret,
      };

  AppConfig copyWith({
    String? projectName,
    String? projectId,
    String? projectUrl,
    String? logPath,
    bool? fullscreen,
    String? extraInfo,
    String? updateUrl,
    String? userAgent,
    bool? allowMixedContent,
    bool? cacheEnabled,
    bool? keepScreenOn,
    String? hardwareBackAction,
    String? bridgeSecret,
  }) {
    return AppConfig(
      projectName: projectName ?? this.projectName,
      projectId: projectId ?? this.projectId,
      projectUrl: projectUrl ?? this.projectUrl,
      logPath: logPath ?? this.logPath,
      fullscreen: fullscreen ?? this.fullscreen,
      extraInfo: extraInfo ?? this.extraInfo,
      updateUrl: updateUrl ?? this.updateUrl,
      userAgent: userAgent ?? this.userAgent,
      allowMixedContent: allowMixedContent ?? this.allowMixedContent,
      cacheEnabled: cacheEnabled ?? this.cacheEnabled,
      keepScreenOn: keepScreenOn ?? this.keepScreenOn,
      hardwareBackAction: hardwareBackAction ?? this.hardwareBackAction,
      bridgeSecret: bridgeSecret ?? this.bridgeSecret,
    );
  }

  /// 用部分字段更新（用于 Bridge setConfig）
  void applyPartial(Map<String, dynamic> partial) {
    if (partial.containsKey('projectName')) {
      projectName = partial['projectName']?.toString() ?? projectName;
    }
    if (partial.containsKey('projectId')) {
      projectId = partial['projectId']?.toString() ?? projectId;
    }
    if (partial.containsKey('projectUrl')) {
      projectUrl = partial['projectUrl']?.toString() ?? projectUrl;
    }
    if (partial.containsKey('logPath')) {
      logPath = partial['logPath']?.toString() ?? logPath;
    }
    if (partial.containsKey('fullscreen')) {
      fullscreen = partial['fullscreen'] == true;
    }
    if (partial.containsKey('extraInfo')) {
      extraInfo = partial['extraInfo']?.toString() ?? extraInfo;
    }
    if (partial.containsKey('updateUrl')) {
      updateUrl = partial['updateUrl']?.toString() ?? updateUrl;
    }
    if (partial.containsKey('userAgent')) {
      userAgent = partial['userAgent']?.toString() ?? userAgent;
    }
    if (partial.containsKey('allowMixedContent')) {
      allowMixedContent = partial['allowMixedContent'] == true;
    }
    if (partial.containsKey('cacheEnabled')) {
      cacheEnabled = partial['cacheEnabled'] == true;
    }
    if (partial.containsKey('keepScreenOn')) {
      keepScreenOn = partial['keepScreenOn'] == true;
    }
    if (partial.containsKey('hardwareBackAction')) {
      final v = partial['hardwareBackAction']?.toString() ?? hardwareBackAction;
      if (hardwareBackActions.contains(v)) hardwareBackAction = v;
    }
    if (partial.containsKey('bridgeSecret')) {
      bridgeSecret = partial['bridgeSecret']?.toString() ?? bridgeSecret;
    }
  }

  String? validate() {
    if (projectName.trim().isEmpty) return '请填写项目名称';
    if (projectId.trim().isEmpty) return '请填写项目 ID';
    if (projectUrl.trim().isEmpty) return '请填写项目 URL';
    final uri = Uri.tryParse(projectUrl.trim());
    if (uri == null || !(uri.isScheme('http') || uri.isScheme('https'))) {
      return '项目 URL 须为 http/https 地址';
    }
    if (updateUrl.trim().isNotEmpty) {
      final u = Uri.tryParse(updateUrl.trim());
      if (u == null || !(u.isScheme('http') || u.isScheme('https'))) {
        return '自动更新地址须为 http/https 地址';
      }
    }
    if (!hardwareBackActions.contains(hardwareBackAction)) {
      return '返回键行为无效';
    }
    return null;
  }
}
