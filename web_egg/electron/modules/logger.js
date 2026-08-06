'use strict';

const fs = require('fs');
const path = require('path');
const { ensureDir } = require('./config');

let logDir = null;

function pad(n) {
  return String(n).padStart(2, '0');
}

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
}

function todayFileName() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.log`;
}

function init(dir) {
  logDir = dir;
  ensureDir(logDir);
}

function write(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}\n`;
  try {
    if (logDir) {
      ensureDir(logDir);
      fs.appendFileSync(path.join(logDir, todayFileName()), line, 'utf8');
    }
  } catch (err) {
    console.error('写日志失败:', err);
  }
  if (level === 'ERROR') {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }
}

function info(msg) {
  write('INFO', typeof msg === 'string' ? msg : JSON.stringify(msg));
}

function warn(msg) {
  write('WARN', typeof msg === 'string' ? msg : JSON.stringify(msg));
}

function error(msg) {
  write('ERROR', typeof msg === 'string' ? msg : JSON.stringify(msg));
}

function fromWeb(message) {
  write('WEB', typeof message === 'string' ? message : JSON.stringify(message));
}

module.exports = {
  init,
  info,
  warn,
  error,
  fromWeb,
  getLogDir: () => logDir
};
