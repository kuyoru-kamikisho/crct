/**
 * 从角色/奇波/物品源文件生成轻量目录，供首页、侧栏、SEO 使用，
 * 避免首屏同步拉取数百个数据模块。
 *
 * 用法：node scripts/generate-encyclopedia-meta.js
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { CHARACTER_ORDER } from '../src/data/characterOrder.js'
import { buildItemSourceCatalog } from '../src/data/itemSources.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

async function loadDefaultExports(dir) {
  let files = []
  try {
    files = await readdir(dir)
  } catch {
    return []
  }
  const list = []
  for (const file of files) {
    if (!file.endsWith('.js')) continue
    const text = await readFile(join(dir, file), 'utf8')
    const idx = text.indexOf('export default')
    if (idx < 0) continue
    const expr = text
      .slice(idx + 'export default'.length)
      .trim()
      .replace(/;?\s*$/, '')
    const data = Function(`"use strict"; return (${expr})`)()
    if (data?.id) list.push(data)
  }
  return list
}

function parseQiboNo(no) {
  const s = String(no ?? '')
  const m = s.match(/^(\d+)([A-Za-z]*)$/)
  if (!m) return [Number.MAX_SAFE_INTEGER, s]
  return [Number(m[1]), m[2] || '']
}

function sortCharacters(list) {
  const byId = new Map(list.map((item) => [item.id, item]))
  const ordered = CHARACTER_ORDER.map((id) => byId.get(id)).filter(Boolean)
  const extras = list
    .filter((item) => !CHARACTER_ORDER.includes(item.id))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'zh-CN'))
  return [...ordered, ...extras]
}

function sortQibos(list) {
  return [...list].sort((a, b) => {
    const [na, sa] = parseQiboNo(a.no)
    const [nb, sb] = parseQiboNo(b.no)
    if (na !== nb) return na - nb
    return sa.localeCompare(sb)
  })
}

function sortItems(list) {
  return [...list].sort((a, b) => {
    const rarityDiff = Number(b.rarity || 0) - Number(a.rarity || 0)
    if (rarityDiff) return rarityDiff
    return String(a.name).localeCompare(String(b.name), 'zh-CN')
  })
}

async function latestMtime(dir) {
  let files = []
  try {
    files = await readdir(dir)
  } catch {
    return 0
  }
  let max = 0
  for (const file of files) {
    if (!file.endsWith('.js')) continue
    try {
      const info = await stat(join(dir, file))
      if (info.mtimeMs > max) max = info.mtimeMs
    } catch {
      /* skip */
    }
  }
  return max
}

export async function generateEncyclopediaMeta(root = ROOT, { force = false } = {}) {
  const outFile = join(root, 'src/data/encyclopediaMeta.js')
  if (!force) {
    try {
      const outTime = (await stat(outFile)).mtimeMs
      const newest = Math.max(
        await latestMtime(join(root, 'src/data/characters')),
        await latestMtime(join(root, 'src/data/qibos')),
        await latestMtime(join(root, 'src/data/items')),
        (await stat(join(root, 'src/data/characterOrder.js'))).mtimeMs,
        (await stat(join(root, 'src/data/itemSources.js'))).mtimeMs,
      )
      if (outTime >= newest) return { skipped: true }
    } catch {
      /* generate */
    }
  }

  const characters = sortCharacters(await loadDefaultExports(join(root, 'src/data/characters')))
  const qibos = sortQibos(await loadDefaultExports(join(root, 'src/data/qibos')))
  const items = sortItems(await loadDefaultExports(join(root, 'src/data/items')))
  const itemSourceCatalog = buildItemSourceCatalog(items).map((src) => ({
    id: src.id,
    name: src.name,
    icon: src.icon,
    rank: src.rank,
    kind: src.kind,
    path: src.path,
    count: src.count,
    ways: src.ways || [],
  }))

  const body = `/**
 * 由 scripts/generate-encyclopedia-meta.js 自动生成，请勿手改。
 * 仅含首页/侧栏/SEO 需要的轻量字段，避免首屏加载全量图鉴。
 */
export const encyclopediaStats = ${JSON.stringify(
    {
      characters: characters.length,
      qibos: qibos.length,
      items: items.length,
    },
    null,
    2,
  )}

export const characterSummaries = ${JSON.stringify(
    characters.map((item) => ({
      id: item.id,
      name: item.name,
      nameEn: item.nameEn || '',
    })),
    null,
    2,
  )}

export const qiboSummaries = ${JSON.stringify(
    qibos.map((item) => ({
      id: item.id,
      name: item.name,
      no: item.no ?? null,
    })),
    null,
    2,
  )}

export const featuredItemNames = ${JSON.stringify(
    items.slice(0, 3).map((item) => item.name),
    null,
    2,
  )}

export const itemSourceCatalog = ${JSON.stringify(itemSourceCatalog, null, 2)}
`

  await writeFile(join(root, 'src/data/encyclopediaMeta.js'), `${body.trim()}\n`, 'utf8')
  return {
    characters: characters.length,
    qibos: qibos.length,
    items: items.length,
    sources: itemSourceCatalog.length,
  }
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
if (invokedDirectly) {
  generateEncyclopediaMeta(ROOT, { force: true })
    .then((stats) => {
      if (stats.skipped) {
        console.log('[encyclopedia-meta] 已是最新，跳过')
        return
      }
      console.log(
        `[encyclopedia-meta] 已生成：角色 ${stats.characters}，奇波 ${stats.qibos}，物品 ${stats.items}，来源 ${stats.sources}`,
      )
    })
    .catch((error) => {
      console.error('[encyclopedia-meta] 生成失败:', error)
      process.exit(1)
    })
}
