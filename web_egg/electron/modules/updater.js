'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const { app } = require('electron');
const { getAppRoot, ensureDir } = require('./config');
const logger = require('./logger');

const UPDATE_DIR_NAME = 'updates';
const PENDING_META = 'pending.json';
const PENDING_INSTALLER = 'pending-setup.exe';

function getUpdateDir() {
  return path.join(getAppRoot(), UPDATE_DIR_NAME);
}

function getPendingMetaPath() {
  return path.join(getUpdateDir(), PENDING_META);
}

function getPendingInstallerPath() {
  return path.join(getUpdateDir(), PENDING_INSTALLER);
}

function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function joinUrl(base, file) {
  const b = String(base || '').replace(/\/+$/, '');
  return `${b}/${file}`;
}

function fetchJson(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJson(res.headers.location, timeoutMs).then(resolve).catch(reject);
        res.resume();
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
  });
}

function downloadFile(url, dest, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(dest));
    const tmp = `${dest}.downloading`;
    const file = fs.createWriteStream(tmp);
    const lib = url.startsWith('https') ? https : http;

    const doGet = (currentUrl) => {
      const req = lib.get(currentUrl, { timeout: timeoutMs }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          doGet(res.headers.location);
          res.resume();
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
          reject(new Error(`下载失败 HTTP ${res.statusCode}`));
          res.resume();
          return;
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            try {
              if (fs.existsSync(dest)) fs.unlinkSync(dest);
              fs.renameSync(tmp, dest);
              resolve(dest);
            } catch (e) {
              reject(e);
            }
          });
        });
      });
      req.on('error', (err) => {
        file.close();
        try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
        reject(err);
      });
      req.on('timeout', () => {
        req.destroy();
        file.close();
        try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
        reject(new Error('下载超时'));
      });
    };

    doGet(url);
  });
}

function readPending() {
  const p = getPendingMetaPath();
  if (!fs.existsSync(p) || !fs.existsSync(getPendingInstallerPath())) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function clearPending() {
  try {
    const meta = getPendingMetaPath();
    const installer = getPendingInstallerPath();
    if (fs.existsSync(meta)) fs.unlinkSync(meta);
    if (fs.existsSync(installer)) fs.unlinkSync(installer);
  } catch (err) {
    logger.warn(`清理更新缓存失败: ${err.message}`);
  }
}

function writePending(meta) {
  ensureDir(getUpdateDir());
  fs.writeFileSync(getPendingMetaPath(), JSON.stringify(meta, null, 2), 'utf8');
}

/**
 * 启动时检查是否有已下载的更新，有则拉起外置助手并退出当前进程
 * @returns {boolean} 是否即将退出以安装更新
 */
function applyPendingUpdateIfReady() {
  const pending = readPending();
  if (!pending) return false;

  const current = app.getVersion();
  if (compareVersions(pending.version, current) <= 0) {
    logger.info(`待安装版本 ${pending.version} 不高于当前 ${current}，清理更新缓存`);
    clearPending();
    return false;
  }

  const installerPath = getPendingInstallerPath();
  if (!fs.existsSync(installerPath)) {
    clearPending();
    return false;
  }

  const helperSrc = app.isPackaged
    ? path.join(process.resourcesPath, 'updater-helper.js')
    : path.join(__dirname, '..', '..', 'scripts', 'updater-helper.js');

  if (!fs.existsSync(helperSrc)) {
    logger.error('找不到 updater-helper.js，无法安装更新');
    return false;
  }

  const exePath = process.execPath;
  const args = [
    helperSrc,
    '--installer', installerPath,
    '--exe', exePath,
    '--wait-pid', String(process.pid),
    '--meta', getPendingMetaPath()
  ];

  logger.info(`准备安装更新 ${pending.version}，启动更新助手`);

  const child = spawn(exePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1'
    }
  });
  child.unref();
  return true;
}

/**
 * 后台静默检查并下载更新
 */
async function checkAndDownloadUpdate(updateUrl) {
  if (!updateUrl || !String(updateUrl).trim()) {
    return { ok: false, reason: 'no_update_url' };
  }

  try {
    const versionUrl = joinUrl(updateUrl, 'version.json');
    logger.info(`检查更新: ${versionUrl}`);
    const remote = await fetchJson(versionUrl);
    const remoteVersion = remote.version;
    const downloadUrl = remote.download_url;
    const updateLog = remote.update_log || '';

    if (!remoteVersion || !downloadUrl) {
      return { ok: false, reason: 'invalid_version_json' };
    }

    const current = app.getVersion();
    if (compareVersions(remoteVersion, current) <= 0) {
      logger.info(`已是最新版本: ${current}`);
      return { ok: true, upToDate: true, current, remote: remoteVersion };
    }

    const existing = readPending();
    if (existing && existing.version === remoteVersion && fs.existsSync(getPendingInstallerPath())) {
      logger.info(`更新包已就绪: ${remoteVersion}`);
      return { ok: true, ready: true, version: remoteVersion, updateLog };
    }

    logger.info(`发现新版本 ${remoteVersion}，开始静默下载: ${downloadUrl}`);
    await downloadFile(downloadUrl, getPendingInstallerPath());
    writePending({
      version: remoteVersion,
      download_url: downloadUrl,
      update_log: updateLog,
      downloadedAt: new Date().toISOString()
    });
    logger.info(`更新包下载完成: ${remoteVersion}`);
    return { ok: true, downloaded: true, version: remoteVersion, updateLog };
  } catch (err) {
    logger.warn(`检查/下载更新失败: ${err.message}`);
    return { ok: false, reason: err.message };
  }
}

module.exports = {
  compareVersions,
  checkAndDownloadUpdate,
  applyPendingUpdateIfReady,
  readPending,
  clearPending,
  getUpdateDir
};
