/**
 * 功能测试页共用逻辑
 */
(function (global) {
  var API_BASE = "http://localhost:8080";
  var TOKEN_KEY = "promilia_token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function assetUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path) || path.indexOf("data:") === 0) return path;
    return API_BASE + (path.charAt(0) === "/" ? path : "/" + path);
  }

  function queryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || "";
  }

  /**
   * 统一请求封装
   * @param {string} path 如 /api/auth/login
   * @param {object} [options]
   * @param {string} [options.method]
   * @param {object|FormData|null} [options.body]
   * @param {boolean} [options.auth] 是否带 Authorization
   * @param {boolean} [options.raw] 为 true 时 body 已是 FormData/字符串，不再 JSON.stringify
   */
  function api(path, options) {
    options = options || {};
    var method = (options.method || "GET").toUpperCase();
    var headers = {};
    var body = options.body;

    if (options.auth) {
      var token = getToken();
      if (token) {
        headers["Authorization"] = "Bearer " + token;
      }
    }

    if (body != null && !options.raw && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    return fetch(API_BASE + path, {
      method: method,
      headers: headers,
      body: method === "GET" || method === "HEAD" ? undefined : body,
    }).then(function (res) {
      return res.json().catch(function () {
        return { code: -1, message: "响应不是合法 JSON，HTTP " + res.status, data: null };
      });
    });
  }

  function showResult(el, data) {
    if (!el) return;
    el.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  }

  /**
   * 拉取图片验证码并填充到 img + hidden captchaId
   * @param {HTMLImageElement} imgEl
   * @param {HTMLInputElement} idInputEl
   * @param {HTMLElement} [resultEl] 可选，失败时展示错误
   */
  function loadCaptcha(imgEl, idInputEl, resultEl) {
    return api("/api/captcha").then(function (resp) {
      if (resp.code !== 0 || !resp.data) {
        showResult(resultEl, resp);
        return resp;
      }
      if (imgEl) {
        imgEl.src = resp.data.imageBase64;
        imgEl.alt = "验证码";
      }
      if (idInputEl) {
        idInputEl.value = resp.data.captchaId || "";
      }
      return resp;
    }).catch(function (err) {
      var msg = { code: -1, message: String(err && err.message ? err.message : err), data: null };
      showResult(resultEl, msg);
      return msg;
    });
  }

  function bindCaptchaRefresh(btnEl, imgEl, idInputEl, resultEl) {
    function refresh() {
      return loadCaptcha(imgEl, idInputEl, resultEl);
    }
    if (btnEl) {
      btnEl.addEventListener("click", function (e) {
        e.preventDefault();
        refresh();
      });
    }
    if (imgEl) {
      imgEl.style.cursor = "pointer";
      imgEl.title = "点击刷新";
      imgEl.addEventListener("click", function () {
        refresh();
      });
    }
    return refresh();
  }

  function base64ToArrayBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = "";
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 用服务端公钥 RSA-OAEP(SHA-256) 加密密码，返回 Base64 密文。
   * 需 HTTPS 或 localhost；依赖 Web Crypto。
   */
  function encryptPassword(plainPassword) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.reject(new Error("当前环境不支持 Web Crypto，无法加密密码"));
    }
    return api("/api/auth/password-public-key").then(function (resp) {
      if (resp.code !== 0 || !resp.data || !resp.data.publicKey) {
        throw new Error((resp && resp.message) || "获取密码公钥失败");
      }
      return window.crypto.subtle.importKey(
        "spki",
        base64ToArrayBuffer(resp.data.publicKey),
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
      ).then(function (key) {
        var encoded = new TextEncoder().encode(plainPassword);
        return window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, encoded);
      }).then(function (cipherBuf) {
        return arrayBufferToBase64(cipherBuf);
      });
    });
  }

  global.Promilia = {
    API_BASE: API_BASE,
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    assetUrl: assetUrl,
    queryParam: queryParam,
    api: api,
    showResult: showResult,
    loadCaptcha: loadCaptcha,
    bindCaptchaRefresh: bindCaptchaRefresh,
    encryptPassword: encryptPassword,
  };
})(window);
