import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const SERVER_ROOT = join(__dirname, '..', '..', 'promilia_sever')

function pythonBin() {
  return process.env.PYTHON || process.env.PY || 'python'
}

export function catalogCli(args, { input } = {}) {
  const result = spawnSync(pythonBin(), ['catalog.py', ...args], {
    cwd: SERVER_ROOT,
    encoding: 'utf8',
    input,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  })
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'catalog.py failed').trim())
  }
  return result.stdout
}

export function dumpCatalog(kind) {
  return JSON.parse(catalogCli(['dump', kind]) || '[]')
}

export function upsertCatalog(kind, data) {
  return JSON.parse(catalogCli(['upsert', kind], { input: JSON.stringify(data) }) || '{"written":0,"unchanged":0}')
}

export function pruneCatalog(kind, keepIds) {
  return JSON.parse(catalogCli(['prune', kind], { input: JSON.stringify([...keepIds]) }) || '{"removed":0}')
}

export function indexExisting(list) {
  const bySlug = new Map()
  const byName = new Map()
  const byId = new Map()
  for (const data of list || []) {
    if (!data?.id) continue
    byId.set(data.id, data)
    if (data.wikiSlug) bySlug.set(data.wikiSlug, data)
    if (data.name) byName.set(data.name, data)
  }
  return { bySlug, byName, byId }
}
