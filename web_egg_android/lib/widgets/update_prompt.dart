import 'package:flutter/material.dart';

import '../services/update_service.dart';
import '../theme/app_theme.dart';

Future<bool?> showUpdatePrompt(BuildContext context, PendingUpdate pending) {
  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) {
      return AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('发现新版本'),
        content: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '版本 ${pending.version} 已下载完成，是否立即安装？',
                style: Theme.of(ctx).textTheme.bodyLarge,
              ),
              if (pending.updateLog.trim().isNotEmpty) ...[
                const SizedBox(height: 14),
                Text(
                  '更新日志',
                  style: Theme.of(ctx).textTheme.titleSmall?.copyWith(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: AppTheme.primary.withValues(alpha: 0.12),
                    ),
                  ),
                  child: Text(
                    pending.updateLog,
                    style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(
                          color: AppTheme.muted,
                          height: 1.45,
                        ),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('稍后再说'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('立即安装'),
          ),
        ],
      );
    },
  );
}
