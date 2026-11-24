const API_BASE = 'http://localhost:8080'
const TOKEN_KEY = 'promilia_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function assetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path) || path.indexOf('data:') === 0) return path
  return API_BASE + (path.charAt(0) === '/' ? path : '/' + path)
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: any, auth?: boolean, raw?: boolean }} [options]
 */
export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const headers = {}
  let body = options.body

  if (options.auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  if (body != null && !options.raw && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(body)
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  })
  try {
    return await res.json()
  } catch {
    return { code: -1, message: `响应不是合法 JSON，HTTP ${res.status}`, data: null }
  }
}

export function formatResult(data) {
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
}

/** @returns {Promise<{ captchaId: string, imageBase64: string } | null>} */
export async function fetchCaptcha() {
  const resp = await api('/api/captcha')
  if (resp.code !== 0 || !resp.data) {
    throw Object.assign(new Error(resp.message || '获取验证码失败'), { resp })
  }
  return {
    captchaId: resp.data.captchaId || '',
    imageBase64: resp.data.imageBase64 || '',
  }
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

/** RSA-OAEP(SHA-256) 加密密码，返回 Base64 密文 */
export async function encryptPassword(plainPassword) {
  if (!window.crypto?.subtle) {
    throw new Error('当前环境不支持 Web Crypto，无法加密密码')
  }
  const resp = await api('/api/auth/password-public-key')
  if (resp.code !== 0 || !resp.data?.publicKey) {
    throw new Error(resp.message || '获取密码公钥失败')
  }
  const key = await window.crypto.subtle.importKey(
    'spki',
    base64ToArrayBuffer(resp.data.publicKey),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  const cipherBuf = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    key,
    new TextEncoder().encode(plainPassword),
  )
  return arrayBufferToBase64(cipherBuf)
}

export { API_BASE, TOKEN_KEY }
