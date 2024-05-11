import { contextBridge, ipcMain, ipcRenderer } from "electron";

export enum MainListenedKeys {
    getDeps = 'getDeps'
}
export enum ExposedWindowKeys {
    mainApi = 'mainApi'
}

/**
 * 双向模式，获取键值映射列表
 * 
 * [监听]
 */
export function main_handleDeps(deps: DepsObject) {
    ipcMain.handle(MainListenedKeys.getDeps, () => deps)
}
/**
 * [MainApi] 注册器
 */
export function preloadMainApi() {
    contextBridge.exposeInMainWorld(ExposedWindowKeys.mainApi, {
        handleDeps: () => ipcRenderer.invoke(MainListenedKeys.getDeps)
    } as RegisteredWindowApi)
}