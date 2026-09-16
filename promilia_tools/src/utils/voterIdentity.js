import { storageGet, storageSet } from '@/utils/storage'

const TOKEN_KEY = 'voteToken'

function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return bytesToHex(digest)
}

export async function getFingerprint() {
  const parts = [
    navigator.userAgent,
    navigator.language,
    (navigator.languages || []).join(','),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(window.devicePixelRatio || 1),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    String(navigator.hardwareConcurrency || ''),
    navigator.platform || '',
    String(navigator.maxTouchPoints || 0),
    String(new Date().getTimezoneOffset()),
  ]
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 220
    canvas.height = 44
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#3ecfcf'
      ctx.fillRect(0, 0, 220, 44)
      ctx.fillStyle = '#e8c97a'
      ctx.font = '16px "Noto Sans SC", sans-serif'
      ctx.fillText('AzurPromiliaVote', 8, 28)
      parts.push(canvas.toDataURL())
    }
  } catch {
    /* ignore */
  }
  return sha256Hex(parts.join('|'))
}

export function getOrCreateVoteToken() {
  let token = storageGet(TOKEN_KEY, '')
  if (typeof token === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(token)) return token
  token = crypto.randomUUID()
  storageSet(TOKEN_KEY, token)
  return token
}

let cached = null

export async function getVoterIdentity() {
  if (cached) return cached
  const token = getOrCreateVoteToken()
  const fingerprint = await getFingerprint()
  cached = { token, fingerprint }
  return cached
}
