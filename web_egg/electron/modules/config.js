'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_FILE_NAME = 'config.json';

/** 默认配置 */
const DEFAULT_CONFIG = {
  projectName: '',
  projectId: '',
  projectUrl: '',
  logPath: './logs/',
  fullscreen: false,
  alwaysOnTop: false,
  showFrame: true,
  extraInfo: '',
  allowMultiInstance: false,
  updateUrl: '',
  openDevTools: false,
  // 扩展配置
  windowWidth: 1280,
  windowHeight: 800,
  startMaximized: false,
  userAgent: '',
  zoomFactor: 1.0,
  autoHideMenuBar: true,
  confirmOnClose: false,
  ignoreCertificateErrors: false,
  hardwareAcceleration: true,
  backgroundColor: '#0f1419',
  proxyRules: '',
  cachePath: '',
  disableWebSecurity: false,
  kiosk: false,
  muteAudio: false,
  language: 'zh-CN'
};

function getAppRoot() {
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }
  return path.resolve(path.join(__dirname, '..', '..'));
}

function getConfigPath() {
  return path.join(getAppRoot(), CONFIG_FILE_NAME);
}

function resolveLogPath(logPath) {
  if (!logPath) logPath = DEFAULT_CONFIG.logPath;
  if (path.isAbsolute(logPath)) return logPath;
  return path.join(getAppRoot(), logPath);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    console.error('读取配置文件失败:', err);
    return null;
  }
}

function saveConfig(config) {
  const configPath = getConfigPath();
  const merged = { ...DEFAULT_CONFIG, ...config };
  ensureDir(path.dirname(configPath));
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function updateConfig(partial) {
  const current = loadConfig() || { ...DEFAULT_CONFIG };
  const merged = { ...current, ...partial };
  return saveConfig(merged);
}

function hasConfig() {
  return fs.existsSync(getConfigPath());
}

function isConfigValid(config) {
  return !!(config && config.projectUrl && String(config.projectUrl).trim());
}

module.exports = {
  DEFAULT_CONFIG,
  CONFIG_FILE_NAME,
  getAppRoot,
  getConfigPath,
  resolveLogPath,
  ensureDir,
  loadConfig,
  saveConfig,
  updateConfig,
  hasConfig,
  isConfigValid
};
