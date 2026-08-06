'use strict';

/**
 * WebEgg 更新助手
 * 由主程序退出前拉起：等待主进程结束后执行安装包，再重新启动应用。
 *
 * 用法:
 *   electron.exe updater-helper.js --installer <path> --exe <path> --wait-pid <pid> [--meta <path>]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && i + 1 < argv.length) {
      result[a.slice(2)] = argv[++i];
    }
  }
  return result;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isProcessAlive(pid) {
  if (!pid || Number.isNaN(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForExit(pid, timeoutMs = 60000) {
  const start = Date.now();
  while (isProcessAlive(pid)) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`等待进程 ${pid} 退出超时`);
    }
    await sleep(300);
  }
  // 再等一会，确保文件锁释放
  await sleep(800);
}

function runInstaller(installerPath) {
  return new Promise((resolve, reject) => {
    // NSIS: /S 静默；electron-builder 常用 --updated 标记
    const child = spawn(installerPath, ['/S'], {
      detached: false,
      windowsHide: true,
      stdio: 'ignore'
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0 || code === null) resolve();
      else reject(new Error(`安装程序退出码: ${code}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const installer = args.installer;
  const exe = args.exe;
  const waitPid = parseInt(args['wait-pid'], 10);
  const meta = args.meta;

  if (!installer || !exe) {
    console.error('缺少 --installer 或 --exe 参数');
    process.exit(1);
  }

  try {
    if (waitPid) {
      await waitForExit(waitPid);
    } else {
      await sleep(1000);
    }

    if (!fs.existsSync(installer)) {
      throw new Error(`安装包不存在: ${installer}`);
    }

    await runInstaller(installer);

    // 清理 pending 元数据
    if (meta && fs.existsSync(meta)) {
      try { fs.unlinkSync(meta); } catch (_) { /* ignore */ }
    }
    try { fs.unlinkSync(installer); } catch (_) { /* ignore */ }

    // 重新启动应用
    const child = spawn(exe, [], {
      detached: true,
      stdio: 'ignore',
      cwd: path.dirname(exe),
      windowsHide: false
    });
    child.unref();
    process.exit(0);
  } catch (err) {
    console.error('更新失败:', err.message);
    // 失败也尝试启动原程序，避免用户无法打开
    try {
      const child = spawn(exe, [], {
        detached: true,
        stdio: 'ignore',
        cwd: path.dirname(exe)
      });
      child.unref();
    } catch (_) { /* ignore */ }
    process.exit(1);
  }
}

main();
