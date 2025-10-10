import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  Future<void> _launchURL(String url) async {
    final Uri uri = Uri.parse(url);
    if (!await launchUrl(uri)) {
      throw Exception('无法打开链接: $url');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black54,
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // 标题
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.auto_awesome, color: Colors.white, size: 32),
                  SizedBox(width: 12),
                  Text(
                    '关于 Ktop',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 40),

              // 作者信息
              _buildInfoCard(
                icon: Icons.person,
                title: '作者信息 🎨',
                content: 'kuyoru',
              ),
              const SizedBox(height: 24),

              // 软件介绍
              _buildInfoCard(
                icon: Icons.rocket_launch,
                title: '软件初衷 🚀',
                content: '本软件旨在自动化处理那些重复性操作，让您从繁琐的任务中解放出来！\n✨ 专注于提升工作效率 ✨',
              ),
              const SizedBox(height: 24),

              // 隐私说明
              _buildInfoCard(
                icon: Icons.security,
                title: '隐私说明 🔒',
                content:
                    '为了实现自动化功能，本软件需要监听用户的输入事件（键盘、鼠标等）。\n\n'
                    '请放心，我们非常重视您的隐私：\n'
                    '• 除了查询天气和IP的公共API外，不会发送任何网络请求\n'
                    '• 所有数据都在本地处理\n'
                    '• 不会收集您的个人信息',
              ),
              const SizedBox(height: 24),

              // 开源声明
              _buildInfoCard(
                icon: Icons.warning_amber,
                title: '重要声明 ⚠️',
                content:
                    '本软件为完全开源软件，请勿相信任何收费渠道！\n\n'
                    '💡 开源意味着透明、可信赖 💡',
              ),
              const SizedBox(height: 32),

              // GitHub链接
              Card(
                color: Colors.grey[900],
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.code, color: Colors.white, size: 24),
                          SizedBox(width: 8),
                          Text(
                            '开源地址',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      InkWell(
                        onTap: () => _launchURL(
                          'https://github.com/kuyoru-kamikisho/crct/tree/vif/multip',
                        ),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 12,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.grey[800],
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white24),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Image.asset(
                                'assets/icons/github_icon.png',
                                width: 24,
                                height: 24,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 12),
                              const Text(
                                'GitHub 仓库',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.white,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(
                                Icons.open_in_new,
                                color: Colors.white,
                                size: 16,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // 结尾表情
              const Text(
                '感谢使用！🎉',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.white70,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String title,
    required String content,
  }) {
    return Card(
      color: Colors.grey[900],
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: Colors.white, size: 24),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              content,
              style: const TextStyle(
                fontSize: 16,
                color: Colors.white70,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
