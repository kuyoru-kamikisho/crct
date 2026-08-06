'use strict';

const os = require('os');
const { screen, app } = require('electron');

function getDeviceInfo() {
  const displays = screen.getAllDisplays().map((d) => ({
    id: d.id,
    bounds: d.bounds,
    workArea: d.workArea,
    size: d.size,
    workAreaSize: d.workAreaSize,
    scaleFactor: d.scaleFactor,
    rotation: d.rotation,
    internal: d.internal,
    monochrome: d.monochrome,
    colorDepth: d.colorDepth
  }));

  const primary = screen.getPrimaryDisplay();
  const cpus = os.cpus();

  return {
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    osType: os.type(),
    osRelease: os.release(),
    osVersion: typeof os.version === 'function' ? os.version() : os.release(),
    uptime: os.uptime(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpuModel: cpus[0] ? cpus[0].model : '',
    cpuCores: cpus.length,
    cpuSpeed: cpus[0] ? cpus[0].speed : 0,
    homeDir: os.homedir(),
    tmpDir: os.tmpdir(),
    userInfo: (() => {
      try {
        const u = os.userInfo();
        return { username: u.username, uid: u.uid, gid: u.gid, shell: u.shell, homedir: u.homedir };
      } catch {
        return null;
      }
    })(),
    primaryDisplay: {
      bounds: primary.bounds,
      size: primary.size,
      workAreaSize: primary.workAreaSize,
      scaleFactor: primary.scaleFactor,
      colorDepth: primary.colorDepth
    },
    displays,
    screenCount: displays.length,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    locale: app.getLocale()
  };
}

module.exports = { getDeviceInfo };
