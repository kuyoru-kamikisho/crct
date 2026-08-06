'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * 注入到业务 Web 页面的通信 API
 * 页面可通过 window.webEgg 调用
 */
const api = {
  // —— 窗口控制 ——
  close: () => ipcRenderer.invoke('egg:close'),
  minimize: () => ipcRenderer.invoke('egg:minimize'),
  maximize: () => ipcRenderer.invoke('egg:maximize'),
  unmaximize: () => ipcRenderer.invoke('egg:unmaximize'),
  isMaximized: () => ipcRenderer.invoke('egg:isMaximized'),
  fullscreen: (enable = true) => ipcRenderer.invoke('egg:fullscreen', !!enable),
  isFullscreen: () => ipcRenderer.invoke('egg:isFullscreen'),
  focus: () => ipcRenderer.invoke('egg:focus'),
  blur: () => ipcRenderer.invoke('egg:blur'),
  setAlwaysOnTop: (enable = true) => ipcRenderer.invoke('egg:setAlwaysOnTop', !!enable),
  isAlwaysOnTop: () => ipcRenderer.invoke('egg:isAlwaysOnTop'),
  show: () => ipcRenderer.invoke('egg:show'),
  hide: () => ipcRenderer.invoke('egg:hide'),
  setSize: (width, height) => ipcRenderer.invoke('egg:setSize', width, height),
  getSize: () => ipcRenderer.invoke('egg:getSize'),
  setPosition: (x, y) => ipcRenderer.invoke('egg:setPosition', x, y),
  getPosition: () => ipcRenderer.invoke('egg:getPosition'),
  center: () => ipcRenderer.invoke('egg:center'),
  setTitle: (title) => ipcRenderer.invoke('egg:setTitle', title),
  setKiosk: (enable = true) => ipcRenderer.invoke('egg:setKiosk', !!enable),
  flashFrame: (enable = true) => ipcRenderer.invoke('egg:flashFrame', !!enable),

  // —— DevTools ——
  openDevTools: () => ipcRenderer.invoke('egg:openDevTools'),
  closeDevTools: () => ipcRenderer.invoke('egg:closeDevTools'),
  toggleDevTools: () => ipcRenderer.invoke('egg:toggleDevTools'),

  // —— 配置 ——
  getConfig: () => ipcRenderer.invoke('egg:getConfig'),
  setConfig: (partial) => ipcRenderer.invoke('egg:setConfig', partial),
  getExtraInfo: () => ipcRenderer.invoke('egg:getExtraInfo'),
  setExtraInfo: (info) => ipcRenderer.invoke('egg:setExtraInfo', info),

  // —— 日志 ——
  writeLog: (message) => ipcRenderer.invoke('egg:writeLog', message),

  // —— 设备信息 ——
  getDeviceInfo: () => ipcRenderer.invoke('egg:getDeviceInfo'),
  getAppVersion: () => ipcRenderer.invoke('egg:getAppVersion'),
  getAppPath: () => ipcRenderer.invoke('egg:getAppPath'),

  // —— 外部程序 ——
  exec: (command, args = [], options = {}) =>
    ipcRenderer.invoke('egg:exec', command, args, options),
  openPath: (targetPath) => ipcRenderer.invoke('egg:openPath', targetPath),
  openExternal: (url) => ipcRenderer.invoke('egg:openExternal', url),

  // —— 页面控制 ——
  reload: (ignoreCache = false) => ipcRenderer.invoke('egg:reload', ignoreCache),
  navigate: (url) => ipcRenderer.invoke('egg:navigate', url),
  goBack: () => ipcRenderer.invoke('egg:goBack'),
  goForward: () => ipcRenderer.invoke('egg:goForward'),
  setZoomFactor: (factor) => ipcRenderer.invoke('egg:setZoomFactor', factor),
  getZoomFactor: () => ipcRenderer.invoke('egg:getZoomFactor'),
  clearCache: () => ipcRenderer.invoke('egg:clearCache'),
  print: (options = {}) => ipcRenderer.invoke('egg:print', options),

  // —— 剪贴板 / 通知 ——
  clipboardWrite: (text) => ipcRenderer.invoke('egg:clipboardWrite', text),
  clipboardRead: () => ipcRenderer.invoke('egg:clipboardRead'),
  notify: (title, body) => ipcRenderer.invoke('egg:notify', title, body),

  // —— 应用生命周期 ——
  restart: () => ipcRenderer.invoke('egg:restart'),
  checkUpdate: () => ipcRenderer.invoke('egg:checkUpdate'),
  getUpdateStatus: () => ipcRenderer.invoke('egg:getUpdateStatus'),

  // —— 事件订阅（软件 -> Web） ——
  on: (channel, listener) => {
    const allowed = [
      'egg:event:focus',
      'egg:event:blur',
      'egg:event:resize',
      'egg:event:fullscreen',
      'egg:event:maximize',
      'egg:event:unmaximize',
      'egg:event:before-close',
      'egg:event:update-available',
      'egg:event:config-changed'
    ];
    if (!allowed.includes(channel)) return () => {};
    const wrapper = (_event, payload) => listener(payload);
    ipcRenderer.on(channel, wrapper);
    return () => ipcRenderer.removeListener(channel, wrapper);
  }
};

contextBridge.exposeInMainWorld('webEgg', api);
contextBridge.exposeInMainWorld('WebEgg', api);
