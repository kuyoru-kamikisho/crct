/**
 * 本地软存储封装 —— 纯静态离线应用，偏好与状态均落在 localStorage
 */
const PREFIX = 'ap-wiki:'

export function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function storageRemove(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}
