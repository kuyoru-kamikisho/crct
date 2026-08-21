/**
 * 从 BWiki《物品一览》爬取物品数据，写入 src/data/items/{id}.js，
 * 并下载列表页物品图标。
 *
 * 可重复执行：wiki 新增条目会补文件，已有条目按详情页覆盖更新；
 * 图片仅在本地缺失或源地址变化时重新下载。
 *
 * 用法：
 *   node scripts/item-spider.js
 *   node scripts/item-spider.js --limit 5
 *   node scripts/item-spider.js --only 水晶饰品套装
 *   node scripts/item-spider.js --force-images
 *   node scripts/item-spider.js --prune
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as cheerio from 'cheerio'
import { pinyin } from 'pinyin-pro'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'src/data/items')
const IMAGE_DIR = join(ROOT, 'public/imgs/items')
const IMAGE_PUBLIC_PATH = '/imgs/items'

const LIST_URL = 'https://wiki.biligame.com/ap/%E7%89%A9%E5%93%81%E4%B8%80%E8%A7%88'
const ORIGIN = 'https://wiki.biligame.com'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const args = parseArgs(process.argv.slice(2))

function parseArgs(argv) {
  const out = { limit: 0, only: '', forceImages: false, prune: false, delay: 280 }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    const next = argv[i + 1]
    if (token === '--limit' && next) {
      out.limit = Number(next) || 0
      i += 1
    } else if (token === '--only' && next) {
      out.only = next
      i += 1
    } else if (token === '--delay' && next) {
      out.delay = Math.max(0, Number(next) || 0)
      i += 1
    } else if (token === '--force-images') {
      out.forceImages = true
    } else if (token === '--prune') {
      out.prune = true
    }
  }
  return out
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isIdent(key) {
  return /^[A-Za-z_$][\w$]*$/.test(key)
}

function serialize(value, indent = 0) {
  const pad = '  '.repeat(indent)
  const inner = '  '.repeat(indent + 1)
  if (value === null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    return `[\n${value.map((item) => `${inner}${serialize(item, indent + 1)}`).join(',\n')}\n${pad}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined)
    if (!entries.length) return '{}'
    return `{\n${entries
      .map(([key, item]) => `${inner}${isIdent(key) ? key : JSON.stringify(key)}: ${serialize(item, indent + 1)}`)
      .join(',\n')}\n${pad}}`
  }
  return 'null'
}

function toModuleSource(data) {
  return `/** ${data.name} */\nexport default ${serialize(data)}\n`
}

function decodeWikiPath(href = '') {
  if (!href) return ''
  try {
    return decodeURIComponent(href)
  } catch {
    return href
  }
}

function absoluteUrl(href) {
  if (!href) return ''
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  if (href.startsWith('//')) return `https:${href}`
  if (href.startsWith('/')) return `${ORIGIN}${href}`
  return `${ORIGIN}/${href}`
}

function wikiSlugFromHref(href) {
  const path = decodeWikiPath(href).replace(/\/+$/, '')
  const parts = path.split('/')
  return parts[parts.length - 1] || ''
}

function slugifyId(name) {
  const py = pinyin(String(name || ''), {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
    v: true,
  })
  const joined = (Array.isArray(py) ? py.join('') : String(py || ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return joined
}

function uniqueId(base, used, fallback) {
  let id = base || slugifyId(fallback) || 'item'
  if (!used.has(id)) return id
  const withFb = `${id}-${slugifyId(fallback)}`.replace(/-+$/g, '')
  if (withFb && !used.has(withFb)) return withFb
  let i = 2
  while (used.has(`${id}-${i}`)) i += 1
  return `${id}-${i}`
}

function splitList(value) {
  return String(value || '')
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseRarity(text) {
  const m = String(text || '').match(/(\d+)/)
  return m ? Number(m[1]) : 0
}

function textWithBreaks($, el) {
  if (!el || !el.length) return ''
  const clone = el.clone()
  clone.find('br').replaceWith('\n')
  return clone
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function unique(list) {
  return [...new Set(list.map((item) => String(item || '').trim()).filter(Boolean))]
}

function extFromUrlOrType(url, contentType) {
  const fromType = String(contentType || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
  if (fromType === 'image/jpeg') return '.jpg'
  if (fromType === 'image/webp') return '.webp'
  if (fromType === 'image/gif') return '.gif'
  if (fromType === 'image/png') return '.png'
  const clean = String(url || '').split('?')[0]
  const m = clean.match(/\.(png|jpg|jpeg|webp|gif)$/i)
  if (!m) return '.png'
  return m[1].toLowerCase() === 'jpeg' ? '.jpg' : `.${m[1].toLowerCase()}`
}

function preferOriginalImage(url) {
  const abs = absoluteUrl(url)
  if (!abs) return ''
  const thumb = abs.match(/^(https?:\/\/[^/]+\/images\/[^/]+)\/thumb\/(.+?)\/\d+px-[^/]+$/i)
  if (thumb) return `${thumb[1]}/${thumb[2]}`
  return abs
}

function pickListImage($el) {
  const $img = $el.find('img.common_item-img, img').first()
  const src = $img.attr('src') || $img.attr('data-src') || ''
  const srcset = $img.attr('srcset') || $img.attr('data-srcset') || ''
  let best = src
  if (srcset) {
    const parts = srcset
      .split(',')
      .map((part) => part.trim().split(/\s+/)[0])
      .filter(Boolean)
    if (parts.length) best = parts[parts.length - 1]
  }
  return preferOriginalImage(best) || absoluteUrl(src)
}

async function fetchText(url, { retries = 3 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          Referer: LIST_URL,
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      return await res.text()
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(600 * attempt)
    }
  }
  throw lastError
}

async function fetchBuffer(url, { retries = 3 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: `${ORIGIN}/ap/`,
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const buf = Buffer.from(await res.arrayBuffer())
      return { buf, contentType: res.headers.get('content-type') || '' }
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(600 * attempt)
    }
  }
  throw lastError
}

async function loadExisting() {
  const bySlug = new Map()
  const byName = new Map()
  const byId = new Map()
  if (!existsSync(DATA_DIR)) return { bySlug, byName, byId }
  const files = await readdir(DATA_DIR)
  for (const file of files) {
    if (!file.endsWith('.js')) continue
    const href = pathToFileURL(join(DATA_DIR, file)).href
    const mod = await import(href)
    const data = mod.default
    if (!data?.id) continue
    byId.set(data.id, data)
    if (data.wikiSlug) bySlug.set(data.wikiSlug, data)
    if (data.name) byName.set(data.name, data)
  }
  return { bySlug, byName, byId }
}

function parseList(html) {
  const $ = cheerio.load(html)
  const list = []
  const seen = new Set()
  $('#CardSelectTr')
    .children()
    .each((_, node) => {
      const $el = $(node)
      const name = $el.find('.common_item-name').first().text().trim()
      const href = $el.find('a[href]').first().attr('href') || ''
      if (!name || !href) return
      const wikiSlug = wikiSlugFromHref(href)
      const key = wikiSlug || name
      if (seen.has(key)) return
      seen.add(key)
      list.push({
        name,
        href,
        wikiSlug,
        wikiUrl: absoluteUrl(href),
        rarity: parseRarity($el.attr('data-param1')),
        types: splitList($el.attr('data-param2')),
        imageUrl: pickListImage($el),
      })
    })
  return list
}

function parseDetail(html) {
  const $ = cheerio.load(html)
  const tags = unique(
    $('.common_item-tag')
      .map((_, node) => $(node).text().trim())
      .get(),
  )
  const ways = unique(
    $('.common_item-waydesc')
      .map((_, node) => $(node).text().trim())
      .get(),
  )
  const desc = textWithBreaks($, $('.common_item-desc:not(.common_item-food)').first())
  const spdesc = textWithBreaks($, $('.common_item-spdesc').first())
  const effects = unique(
    $('.common_item-desc.common_item-food')
      .find('div')
      .map((_, node) => $(node).text().trim())
      .get(),
  )
  if (!effects.length) {
    const foodText = textWithBreaks($, $('.common_item-desc.common_item-food').first())
    if (foodText) effects.push(...foodText.split('\n').map((line) => line.trim()).filter(Boolean))
  }
  return { tags, ways, desc, spdesc, effects }
}

function buildRecord(listed, detail, id, imagePath) {
  return {
    id,
    name: listed.name,
    wikiSlug: listed.wikiSlug,
    wikiUrl: listed.wikiUrl,
    rarity: listed.rarity || 0,
    types: listed.types,
    tags: detail.tags.length ? detail.tags : listed.types,
    ways: detail.ways,
    desc: detail.desc,
    spdesc: detail.spdesc,
    effects: detail.effects,
    image: imagePath,
    imageUrl: listed.imageUrl,
  }
}

async function downloadImage(url, id, existing, force) {
  if (!url) return { image: existing?.image || '', skipped: true, reason: 'no-url' }
  const prevUrl = existing?.imageUrl
  const prevImage = existing?.image || ''
  const prevAbs = prevImage ? join(ROOT, 'public', prevImage.replace(/^\//, '')) : ''
  if (!force && prevUrl === url && prevAbs && existsSync(prevAbs)) {
    return { image: prevImage, skipped: true, reason: 'unchanged' }
  }

  const candidates = unique([url, preferOriginalImage(url)].filter(Boolean))
  let lastError
  for (const candidate of candidates) {
    try {
      const { buf, contentType } = await fetchBuffer(candidate)
      const ext = extFromUrlOrType(candidate, contentType)
      const filename = `${id}${ext}`
      await mkdir(IMAGE_DIR, { recursive: true })
      await writeFile(join(IMAGE_DIR, filename), buf)
      if (prevAbs && existsSync(prevAbs) && !prevAbs.endsWith(filename)) {
        await rm(prevAbs, { force: true })
      }
      return { image: `${IMAGE_PUBLIC_PATH}/${filename}`, skipped: false }
    } catch (error) {
      lastError = error
    }
  }
  if (prevImage && prevAbs && existsSync(prevAbs)) {
    return { image: prevImage, skipped: true, reason: `keep-old:${lastError?.message || 'download-failed'}` }
  }
  throw lastError || new Error('download failed')
}

async function writeItemFile(data) {
  await mkdir(DATA_DIR, { recursive: true })
  const file = join(DATA_DIR, `${data.id}.js`)
  const next = toModuleSource(data)
  if (existsSync(file)) {
    const prev = await readFile(file, 'utf8')
    if (prev === next) return { file, changed: false }
  }
  await writeFile(file, next, 'utf8')
  return { file, changed: true }
}

function resolveId(listed, existing, used) {
  const reused =
    existing.bySlug.get(listed.wikiSlug) ||
    (existing.byName.get(listed.name) && existing.byName.get(listed.name).wikiSlug == null
      ? existing.byName.get(listed.name)
      : null)
  if (reused?.id && (!used.has(reused.id) || used.get(reused.id) === listed.wikiSlug)) {
    return reused.id
  }
  return uniqueId(slugifyId(listed.wikiSlug || listed.name), used, listed.name)
}

async function pruneStale(keepIds, keepImages) {
  if (!existsSync(DATA_DIR)) return { files: 0, images: 0 }
  let files = 0
  let images = 0
  for (const file of await readdir(DATA_DIR)) {
    if (!file.endsWith('.js')) continue
    const id = file.slice(0, -3)
    if (keepIds.has(id)) continue
    await rm(join(DATA_DIR, file), { force: true })
    files += 1
  }
  if (existsSync(IMAGE_DIR)) {
    for (const file of await readdir(IMAGE_DIR)) {
      const publicPath = `${IMAGE_PUBLIC_PATH}/${file}`
      if (keepImages.has(publicPath)) continue
      await rm(join(IMAGE_DIR, file), { force: true })
      images += 1
    }
  }
  return { files, images }
}

async function main() {
  console.log('[item-spider] 读取物品一览…')
  const listHtml = await fetchText(LIST_URL)
  let listed = parseList(listHtml)
  if (!listed.length) throw new Error('列表页未解析到物品，页面结构可能已变化')

  if (args.only) {
    listed = listed.filter(
      (item) => item.name === args.only || item.wikiSlug === args.only || item.id === args.only,
    )
    if (!listed.length) throw new Error(`未找到 --only ${args.only}`)
  }
  if (args.limit > 0) listed = listed.slice(0, args.limit)

  const existing = await loadExisting()
  const used = new Map()
  for (const item of listed) {
    const id = resolveId(item, existing, used)
    used.set(id, item.wikiSlug)
    item.id = id
  }

  const stats = { written: 0, unchanged: 0, images: 0, imageSkip: 0, failed: 0 }
  const keepIds = new Set()
  const keepImages = new Set()
  const wayCounts = new Map()

  for (let i = 0; i < listed.length; i += 1) {
    const item = listed[i]
    const label = `[${i + 1}/${listed.length}] ${item.name}`
    try {
      if (i) await sleep(args.delay)
      const html = await fetchText(item.wikiUrl)
      const detail = parseDetail(html)
      const prev = existing.bySlug.get(item.wikiSlug) || existing.byId.get(item.id)
      const imageResult = await downloadImage(item.imageUrl, item.id, prev, args.forceImages)
      if (imageResult.skipped) stats.imageSkip += 1
      else stats.images += 1
      const record = buildRecord(item, detail, item.id, imageResult.image)
      const written = await writeItemFile(record)
      if (written.changed) stats.written += 1
      else stats.unchanged += 1
      keepIds.add(record.id)
      if (record.image) keepImages.add(record.image)
      for (const way of record.ways) wayCounts.set(way, (wayCounts.get(way) || 0) + 1)
      const imgNote = imageResult.skipped ? `图跳过(${imageResult.reason})` : '已下载图'
      const wayNote = record.ways.length ? record.ways.join(' / ') : '物品图鉴'
      console.log(`${label} ${written.changed ? '已更新' : '无变化'} ${imgNote} | ${wayNote}`)
    } catch (error) {
      stats.failed += 1
      console.error(`${label} 失败: ${error.message}`)
      if (item.id) keepIds.add(item.id)
      const prev = existing.bySlug.get(item.wikiSlug) || existing.byId.get(item.id)
      if (prev?.image) keepImages.add(prev.image)
    }
  }

  if (args.prune && !args.only && !args.limit) {
    const pruned = await pruneStale(keepIds, keepImages)
    console.log(`[item-spider] 已清理过期文件 ${pruned.files}、图片 ${pruned.images}`)
  }

  const topWays = [...wayCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
  if (topWays.length) {
    console.log('[item-spider] 获取途径（前 12）：')
    for (const [way, count] of topWays) console.log(`  ${count}\t${way}`)
  }

  console.log(
    `[item-spider] 完成：写入 ${stats.written}，未变 ${stats.unchanged}，下载图片 ${stats.images}，跳过图片 ${stats.imageSkip}，失败 ${stats.failed}`,
  )
  if (stats.failed) process.exitCode = 1
}

main().catch((error) => {
  console.error('[item-spider] 中止:', error)
  process.exit(1)
})
