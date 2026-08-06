'use strict';

const { spawn } = require('child_process');
const path = require('path');
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  clipboard,
  Notification,
  Menu
} = require('electron');
const configModule = require('./modules/config');
const logger = require('./modules/logger');
const { getDeviceInfo } = require('./modules/device');
const updater = require('./modules/updater');

let mainWindow = null;
let currentConfig = null;
let isQuitting = false;

function getWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

function broadcast(channel, payload) {
  const win = getWindow();
  if (win) win.webContents.send(channel, payload);
}

function applyWindowFlags(win, cfg) {
  if (!win) return;
  win.setAlwaysOnTop(!!cfg.alwaysOnTop);
  win.setFullScreen(!!cfg.fullscreen);
  if (cfg.kiosk) win.setKiosk(true);
  if (typeof cfg.zoomFactor === 'number' && cfg.zoomFactor > 0) {
    win.webContents.setZoomFactor(cfg.zoomFactor);
  }
}

function buildWindowOptions(cfg, isSettings) {
  const showFrame = isSettings ? true : cfg.showFrame !== false;
  const options = {
    width: cfg.windowWidth || 1280,
    height: cfg.windowHeight || 800,
    minWidth: 640,
    minHeight: 480,
    show: false,
    backgroundColor: cfg.backgroundColor || '#0f1419',
    autoHideMenuBar: cfg.autoHideMenuBar !== false,
    title: cfg.projectName || 'WebEgg',
    webPreferences: {
      preload: isSettings
        ? path.join(__dirname, 'settings-preload.js')
        : path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: !cfg.disableWebSecurity,
      zoomFactor: cfg.zoomFactor || 1
    }
  };

  if (!showFrame) {
    options.frame = false;
  }

  if (cfg.userAgent && !isSettings) {
    options.webPreferences.additionalArguments = [];
  }

  return options;
}

function createSettingsWindow() {
  const cfg = currentConfig || { ...configModule.DEFAULT_CONFIG };
  const win = new BrowserWindow(buildWindowOptions(cfg, true));
  mainWindow = win;

  win.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'settings', 'index.html'));

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  return win;
}

function createAppWindow(cfg) {
  const win = new BrowserWindow(buildWindowOptions(cfg, false));
  mainWindow = win;

  if (cfg.autoHideMenuBar !== false) {
    win.setMenuBarVisibility(false);
    Menu.setApplicationMenu(null);
  }

  if (cfg.userAgent) {
    win.webContents.setUserAgent(cfg.userAgent);
  }

  if (cfg.muteAudio) {
    win.webContents.setAudioMuted(true);
  }

  win.once('ready-to-show', () => {
    if (cfg.startMaximized && !cfg.fullscreen && !cfg.kiosk) {
      win.maximize();
    }
    applyWindowFlags(win, cfg);
    win.show();
    if (cfg.openDevTools) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  win.on('focus', () => broadcast('egg:event:focus'));
  win.on('blur', () => broadcast('egg:event:blur'));
  win.on('resize', () => {
    const [width, height] = win.getSize();
    broadcast('egg:event:resize', { width, height });
  });
  win.on('enter-full-screen', () => broadcast('egg:event:fullscreen', true));
  win.on('leave-full-screen', () => broadcast('egg:event:fullscreen', false));
  win.on('maximize', () => broadcast('egg:event:maximize'));
  win.on('unmaximize', () => broadcast('egg:event:unmaximize'));

  win.on('close', (e) => {
    if (isQuitting) return;
    if (cfg.confirmOnClose) {
      e.preventDefault();
      broadcast('egg:event:before-close');
      dialog
        .showMessageBox(win, {
          type: 'question',
          buttons: ['取消', '退出'],
          defaultId: 1,
          cancelId: 0,
          title: '确认退出',
          message: '确定要退出软件吗？'
        })
        .then(({ response }) => {
          if (response === 1) {
            isQuitting = true;
            win.destroy();
          }
        });
    }
  });

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  win.webContents.on('render-process-gone', (_e, details) => {
    logger.error(`渲染进程异常: ${JSON.stringify(details)}`);
    if (details.reason !== 'clean-exit') {
      setTimeout(() => {
        if (!win.isDestroyed()) win.webContents.reload();
      }, 500);
    }
  });

  win.webContents.on('unresponsive', () => {
    logger.warn('页面无响应');
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const url = String(cfg.projectUrl || '').trim();
  if (url) {
    win.loadURL(url).catch((err) => {
      logger.error(`加载 URL 失败: ${err.message}`);
      dialog.showErrorBox('加载失败', `无法打开项目 URL:\n${url}\n\n${err.message}`);
    });
  }

  return win;
}

function registerIpcHandlers() {
  // —— 设置页 ——
  ipcMain.handle('settings:getDefaults', () => ({ ...configModule.DEFAULT_CONFIG }));
  ipcMain.handle('settings:getConfig', () => currentConfig || configModule.loadConfig() || { ...configModule.DEFAULT_CONFIG });
  ipcMain.handle('settings:getConfigPath', () => configModule.getConfigPath());
  ipcMain.handle('settings:pickDirectory', async () => {
    const win = getWindow();
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });
  ipcMain.handle('settings:saveConfig', (_e, config) => {
    const saved = configModule.saveConfig(config);
    currentConfig = saved;
    logger.init(configModule.resolveLogPath(saved.logPath));
    logger.info('配置已保存，即将进入项目页面');

    const settingsWin = getWindow();
    // 先创建业务窗口，再关设置窗，避免触发 window-all-closed 直接退出
    createAppWindow(saved);
    startBackgroundUpdateCheck(saved);
    if (settingsWin && !settingsWin.isDestroyed()) {
      settingsWin.destroy();
    }
    return { ok: true, config: saved };
  });

  // —— 窗口控制 ——
  ipcMain.handle('egg:close', () => {
    isQuitting = true;
    const win = getWindow();
    if (win) win.close();
    else app.quit();
    return true;
  });
  ipcMain.handle('egg:minimize', () => {
    getWindow()?.minimize();
    return true;
  });
  ipcMain.handle('egg:maximize', () => {
    const win = getWindow();
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });
  ipcMain.handle('egg:unmaximize', () => {
    getWindow()?.unmaximize();
    return true;
  });
  ipcMain.handle('egg:isMaximized', () => !!getWindow()?.isMaximized());
  ipcMain.handle('egg:fullscreen', (_e, enable) => {
    const win = getWindow();
    if (!win) return false;
    win.setFullScreen(!!enable);
    currentConfig = configModule.updateConfig({ fullscreen: !!enable });
    return win.isFullScreen();
  });
  ipcMain.handle('egg:isFullscreen', () => !!getWindow()?.isFullScreen());
  ipcMain.handle('egg:focus', () => {
    const win = getWindow();
    if (!win) return false;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return true;
  });
  ipcMain.handle('egg:blur', () => {
    getWindow()?.blur();
    return true;
  });
  ipcMain.handle('egg:setAlwaysOnTop', (_e, enable) => {
    const win = getWindow();
    if (!win) return false;
    win.setAlwaysOnTop(!!enable);
    currentConfig = configModule.updateConfig({ alwaysOnTop: !!enable });
    return win.isAlwaysOnTop();
  });
  ipcMain.handle('egg:isAlwaysOnTop', () => !!getWindow()?.isAlwaysOnTop());
  ipcMain.handle('egg:show', () => {
    getWindow()?.show();
    return true;
  });
  ipcMain.handle('egg:hide', () => {
    getWindow()?.hide();
    return true;
  });
  ipcMain.handle('egg:setSize', (_e, width, height) => {
    const win = getWindow();
    if (!win) return false;
    win.setSize(Number(width) || 800, Number(height) || 600);
    currentConfig = configModule.updateConfig({
      windowWidth: Number(width) || 800,
      windowHeight: Number(height) || 600
    });
    return true;
  });
  ipcMain.handle('egg:getSize', () => {
    const win = getWindow();
    if (!win) return null;
    const [width, height] = win.getSize();
    return { width, height };
  });
  ipcMain.handle('egg:setPosition', (_e, x, y) => {
    getWindow()?.setPosition(Number(x) || 0, Number(y) || 0);
    return true;
  });
  ipcMain.handle('egg:getPosition', () => {
    const win = getWindow();
    if (!win) return null;
    const [x, y] = win.getPosition();
    return { x, y };
  });
  ipcMain.handle('egg:center', () => {
    getWindow()?.center();
    return true;
  });
  ipcMain.handle('egg:setTitle', (_e, title) => {
    getWindow()?.setTitle(String(title || ''));
    return true;
  });
  ipcMain.handle('egg:setKiosk', (_e, enable) => {
    const win = getWindow();
    if (!win) return false;
    win.setKiosk(!!enable);
    currentConfig = configModule.updateConfig({ kiosk: !!enable });
    return true;
  });
  ipcMain.handle('egg:flashFrame', (_e, enable) => {
    getWindow()?.flashFrame(!!enable);
    return true;
  });

  // —— DevTools ——
  ipcMain.handle('egg:openDevTools', () => {
    getWindow()?.webContents.openDevTools({ mode: 'detach' });
    currentConfig = configModule.updateConfig({ openDevTools: true });
    return true;
  });
  ipcMain.handle('egg:closeDevTools', () => {
    getWindow()?.webContents.closeDevTools();
    currentConfig = configModule.updateConfig({ openDevTools: false });
    return true;
  });
  ipcMain.handle('egg:toggleDevTools', () => {
    const wc = getWindow()?.webContents;
    if (!wc) return false;
    if (wc.isDevToolsOpened()) {
      wc.closeDevTools();
      currentConfig = configModule.updateConfig({ openDevTools: false });
      return false;
    }
    wc.openDevTools({ mode: 'detach' });
    currentConfig = configModule.updateConfig({ openDevTools: true });
    return true;
  });

  // —— 配置 ——
  ipcMain.handle('egg:getConfig', () => currentConfig || configModule.loadConfig());
  ipcMain.handle('egg:setConfig', (_e, partial) => {
    currentConfig = configModule.updateConfig(partial || {});
    broadcast('egg:event:config-changed', currentConfig);
    return currentConfig;
  });
  ipcMain.handle('egg:getExtraInfo', () => (currentConfig && currentConfig.extraInfo) || '');
  ipcMain.handle('egg:setExtraInfo', (_e, info) => {
    currentConfig = configModule.updateConfig({ extraInfo: String(info ?? '') });
    broadcast('egg:event:config-changed', currentConfig);
    return currentConfig.extraInfo;
  });

  // —— 日志 ——
  ipcMain.handle('egg:writeLog', (_e, message) => {
    logger.fromWeb(message);
    return true;
  });

  // —— 设备 / 版本 ——
  ipcMain.handle('egg:getDeviceInfo', () => getDeviceInfo());
  ipcMain.handle('egg:getAppVersion', () => app.getVersion());
  ipcMain.handle('egg:getAppPath', () => ({
    appRoot: configModule.getAppRoot(),
    exePath: process.execPath,
    userData: app.getPath('userData'),
    configPath: configModule.getConfigPath(),
    logPath: logger.getLogDir()
  }));

  // —— 外部程序 ——
  ipcMain.handle('egg:exec', async (_e, command, args = [], options = {}) => {
    if (!command || typeof command !== 'string') {
      return { ok: false, error: 'command 不能为空' };
    }
    return new Promise((resolve) => {
      const child = spawn(command, Array.isArray(args) ? args : [], {
        cwd: options.cwd || configModule.getAppRoot(),
        windowsHide: options.windowsHide !== false,
        shell: options.shell === true,
        detached: options.detached === true,
        env: { ...process.env, ...(options.env || {}) }
      });

      let stdout = '';
      let stderr = '';
      if (child.stdout) child.stdout.on('data', (d) => { stdout += d.toString(); });
      if (child.stderr) child.stderr.on('data', (d) => { stderr += d.toString(); });

      if (options.detached) {
        child.unref();
        resolve({ ok: true, pid: child.pid, detached: true });
        return;
      }

      const timer = options.timeout
        ? setTimeout(() => {
            try { child.kill(); } catch (_) { /* ignore */ }
            resolve({ ok: false, error: '执行超时', stdout, stderr });
          }, options.timeout)
        : null;

      child.on('error', (err) => {
        if (timer) clearTimeout(timer);
        logger.error(`exec 失败: ${err.message}`);
        resolve({ ok: false, error: err.message, stdout, stderr });
      });
      child.on('close', (code) => {
        if (timer) clearTimeout(timer);
        logger.info(`exec 完成: ${command} code=${code}`);
        resolve({ ok: code === 0, code, stdout, stderr, pid: child.pid });
      });
    });
  });

  ipcMain.handle('egg:openPath', async (_e, targetPath) => {
    const err = await shell.openPath(String(targetPath || ''));
    return { ok: !err, error: err || null };
  });
  ipcMain.handle('egg:openExternal', async (_e, url) => {
    await shell.openExternal(String(url || ''));
    return true;
  });

  // —— 页面 ——
  ipcMain.handle('egg:reload', (_e, ignoreCache) => {
    const wc = getWindow()?.webContents;
    if (!wc) return false;
    if (ignoreCache) wc.reloadIgnoringCache();
    else wc.reload();
    return true;
  });
  ipcMain.handle('egg:navigate', async (_e, url) => {
    const win = getWindow();
    if (!win || !url) return false;
    await win.loadURL(String(url));
    currentConfig = configModule.updateConfig({ projectUrl: String(url) });
    return true;
  });
  ipcMain.handle('egg:goBack', () => {
    const wc = getWindow()?.webContents;
    if (wc?.canGoBack()) { wc.goBack(); return true; }
    return false;
  });
  ipcMain.handle('egg:goForward', () => {
    const wc = getWindow()?.webContents;
    if (wc?.canGoForward()) { wc.goForward(); return true; }
    return false;
  });
  ipcMain.handle('egg:setZoomFactor', (_e, factor) => {
    const f = Number(factor);
    if (!f || f <= 0) return false;
    getWindow()?.webContents.setZoomFactor(f);
    currentConfig = configModule.updateConfig({ zoomFactor: f });
    return true;
  });
  ipcMain.handle('egg:getZoomFactor', () => getWindow()?.webContents.getZoomFactor() || 1);
  ipcMain.handle('egg:clearCache', async () => {
    const ses = getWindow()?.webContents.session;
    if (!ses) return false;
    await ses.clearCache();
    return true;
  });
  ipcMain.handle('egg:print', (_e, options) => {
    getWindow()?.webContents.print(options || {});
    return true;
  });

  // —— 剪贴板 / 通知 ——
  ipcMain.handle('egg:clipboardWrite', (_e, text) => {
    clipboard.writeText(String(text ?? ''));
    return true;
  });
  ipcMain.handle('egg:clipboardRead', () => clipboard.readText());
  ipcMain.handle('egg:notify', (_e, title, body) => {
    if (!Notification.isSupported()) return false;
    new Notification({ title: String(title || 'WebEgg'), body: String(body || '') }).show();
    return true;
  });

  // —— 生命周期 / 更新 ——
  ipcMain.handle('egg:restart', () => {
    isQuitting = true;
    app.relaunch();
    app.exit(0);
    return true;
  });
  ipcMain.handle('egg:checkUpdate', async () => {
    const url = currentConfig && currentConfig.updateUrl;
    return updater.checkAndDownloadUpdate(url);
  });
  ipcMain.handle('egg:getUpdateStatus', () => updater.readPending());
}

function startBackgroundUpdateCheck(cfg) {
  if (!cfg || !cfg.updateUrl) return;
  setTimeout(() => {
    updater.checkAndDownloadUpdate(cfg.updateUrl).then((result) => {
      if (result && result.downloaded) {
        broadcast('egg:event:update-available', result);
      }
    });
  }, 3000);
}

function setupSingleInstance(allowMulti) {
  if (allowMulti) return true;
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return false;
  }
  app.on('second-instance', () => {
    const win = getWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
  return true;
}

async function bootstrap() {
  // 硬件加速可在配置中关闭（首次无配置时默认开启）
  const early = configModule.loadConfig();
  if (early && early.hardwareAcceleration === false) {
    app.disableHardwareAcceleration();
  }
  if (early && early.ignoreCertificateErrors) {
    app.commandLine.appendSwitch('ignore-certificate-errors');
  }
  if (early && early.proxyRules) {
    app.commandLine.appendSwitch('proxy-server', early.proxyRules);
  }

  await app.whenReady();

  // 待安装更新：退出并交给助手
  if (updater.applyPendingUpdateIfReady()) {
    app.exit(0);
    return;
  }

  currentConfig = early;
  const allowMulti = !!(currentConfig && currentConfig.allowMultiInstance);
  if (!setupSingleInstance(allowMulti)) return;

  registerIpcHandlers();

  process.on('uncaughtException', (err) => {
    logger.error(`uncaughtException: ${err.stack || err.message}`);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(`unhandledRejection: ${reason}`);
  });

  if (configModule.isConfigValid(currentConfig)) {
    logger.init(configModule.resolveLogPath(currentConfig.logPath));
    logger.info(`启动项目: ${currentConfig.projectName || ''} -> ${currentConfig.projectUrl}`);
    createAppWindow(currentConfig);
    startBackgroundUpdateCheck(currentConfig);
  } else {
    logger.init(configModule.resolveLogPath(configModule.DEFAULT_CONFIG.logPath));
    logger.info('无有效配置，打开设置页');
    createSettingsWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (configModule.isConfigValid(currentConfig)) createAppWindow(currentConfig);
      else createSettingsWindow();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  isQuitting = true;
});

bootstrap().catch((err) => {
  console.error(err);
  app.exit(1);
});
