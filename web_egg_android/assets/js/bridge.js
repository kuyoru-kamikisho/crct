(function () {
  if (window.WebEgg && window.WebEgg.__installed) return;

  var pending = {};
  var ready = false;
  var readyListeners = [];
  var eventListeners = {};
  var seq = 0;

  function nextId() {
    seq += 1;
    return 'we_' + Date.now() + '_' + seq;
  }

  function call(method, params) {
    return new Promise(function (resolve, reject) {
      if (!window.WebEggChannel || typeof window.WebEggChannel.postMessage !== 'function') {
        reject(new Error('WebEggChannel unavailable'));
        return;
      }
      var id = nextId();
      pending[id] = { resolve: resolve, reject: reject };
      var payload = {
        id: id,
        method: method,
        params: params == null ? null : params,
        secret: window.WebEgg.__secret || ''
      };
      try {
        window.WebEggChannel.postMessage(JSON.stringify(payload));
      } catch (e) {
        delete pending[id];
        reject(e);
      }
    });
  }

  function nativeCallback(resp) {
    if (!resp || !resp.id) return;
    var p = pending[resp.id];
    if (!p) return;
    delete pending[resp.id];
    if (resp.ok) p.resolve(resp.data);
    else p.reject(new Error(resp.error || 'bridge error'));
  }

  function setReady() {
    ready = true;
    readyListeners.splice(0).forEach(function (fn) {
      try { fn(); } catch (_) {}
    });
  }

  function onNativeEvent(payload) {
    if (!payload || !payload.event) return;
    var list = eventListeners[payload.event] || [];
    list.forEach(function (fn) {
      try { fn(payload.data); } catch (_) {}
    });
  }

  window.WebEgg = {
    __installed: true,
    __secret: '',
    __nativeCallback: nativeCallback,
    __setReady: setReady,
    __onNativeEvent: onNativeEvent,
    isReady: function () { return ready; },
    onReady: function (fn) {
      if (typeof fn !== 'function') return;
      if (ready) fn();
      else readyListeners.push(fn);
    },
    on: function (event, fn) {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(fn);
    },
    off: function (event, fn) {
      var list = eventListeners[event];
      if (!list) return;
      eventListeners[event] = list.filter(function (x) { return x !== fn; });
    },
    setSecret: function (s) { window.WebEgg.__secret = s || ''; },
    call: call,
    exitApp: function () { return call('exitApp'); },
    setFullscreen: function (enabled) { return call('setFullscreen', !!enabled); },
    writeLog: function (message) { return call('writeLog', String(message)); },
    getConfig: function () { return call('getConfig'); },
    getDeviceInfo: function () { return call('getDeviceInfo'); },
    setConfig: function (partial) { return call('setConfig', partial || {}); },
    reload: function () { return call('reload'); },
    openUrl: function (url) { return call('openUrl', url); },
    clearCache: function () { return call('clearCache'); },
    getAppVersion: function () { return call('getAppVersion'); },
    setKeepScreenOn: function (enabled) { return call('setKeepScreenOn', !!enabled); },
    toast: function (message) { return call('toast', String(message)); },
    openSettings: function () { return call('openSettings'); },
    ping: function () { return call('ping'); }
  };
})();
