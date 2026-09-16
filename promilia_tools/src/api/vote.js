import { getVoterIdentity } from '@/utils/voterIdentity'

const BASE = String(import.meta.env.VITE_VOTE_API_URL || '/vote-api').replace(/\/+$/, '')

export class VoteApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const identity = await getVoterIdentity()
  const headers = {
    Accept: 'application/json',
    'X-Voter-Token': identity.token,
    'X-Device-Fingerprint': identity.fingerprint,
  }
  if (body) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new VoteApiError('OFFLINE', 'offline')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) {
    throw new VoteApiError(data.code || 'FAIL', data.message || 'fail')
  }
  return data
}

export function fetchVoteStatus(category) {
  return request(`/api/status?category=${encodeURIComponent(category)}`)
}

export function fetchVoteRank(category) {
  return request(`/api/rank?category=${encodeURIComponent(category)}`)
}

export function fetchVoteTrend(category, granularity = 'day') {
  return request(
    `/api/trend?category=${encodeURIComponent(category)}&granularity=${encodeURIComponent(granularity)}`,
  )
}

export function submitVote(category, characterIds) {
  return request('/api/vote', {
    method: 'POST',
    body: { category, character_ids: characterIds },
  })
}
