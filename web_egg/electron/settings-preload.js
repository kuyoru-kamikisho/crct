'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsApi', {
  getDefaults: () => ipcRenderer.invoke('settings:getDefaults'),
  getConfig: () => ipcRenderer.invoke('settings:getConfig'),
  saveConfig: (config) => ipcRenderer.invoke('settings:saveConfig', config),
  pickDirectory: () => ipcRenderer.invoke('settings:pickDirectory'),
  getAppVersion: () => ipcRenderer.invoke('egg:getAppVersion'),
  getConfigPath: () => ipcRenderer.invoke('settings:getConfigPath')
});
