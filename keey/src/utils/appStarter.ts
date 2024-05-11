import {BrowserWindow, app} from 'electron';
import * as fs from 'node:fs'
import path from 'path';
import {main_handleDeps} from '../context/main_process';

export enum DepFilePath {
    settings = './deps/settings.json',
    keymaps = './deps/keymaps.json'
}

export async function readDeps(): Promise<DepsObject> {
    const settings = fs.readFileSync(DepFilePath.settings, {encoding: 'utf-8'})
    const keymaps = fs.readFileSync(DepFilePath.keymaps, {encoding: 'utf-8'})

    return {
        settings: JSON.parse(settings),
        keymaps: JSON.parse(keymaps)
    }
}

export class RegisteredWindows {
    static main: BrowserWindow
}

export function createMainWindow(deps: DepsObject) {
    const {settings} = deps;
    const mainWindow = new BrowserWindow({
        width: settings.size[0],
        height: settings.size[1],
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
        frame: false,
        transparent: true
    });
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
    mainWindow.webContents.openDevTools();
    mainWindow.on('resized', () => {
        const size = mainWindow.getSize()
        settings.size = size
        reWriteDepFile(settings, DepFilePath.settings)
    })
    mainWindow.on('moved', () => {
        const position = mainWindow.getPosition()
        settings.position = position
        reWriteDepFile(settings, DepFilePath.settings)
    })
    RegisteredWindows.main = mainWindow;
    return mainWindow;
};

export function initApp(deps: DepsObject) {
    app.on('ready', () => {
        main_handleDeps(deps)
        createMainWindow(deps)
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow(deps);
        }
    });
}

export function reWriteDepFile(o: DepTypes, path: DepFilePath) {
    fs.writeFile(path, JSON.stringify(o, null, 2), {encoding: 'utf-8'}, () => {
    });
}