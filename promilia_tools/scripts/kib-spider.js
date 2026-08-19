/**
 * 从 BWiki《奇波一览》爬取奇波数据，写入 src/data/qibos/{id}.js，
 * 并下载详情页 `.kibo-pixelimg.tab-pane.kibo-tab-normall.active` 中的像素图。
 *
 * 可重复执行：wiki 新增条目会补文件，已有条目按详情页覆盖更新；
 * 像素图仅在本地缺失或源地址变化时重新下载。
 *
 * 用法：
 *   node scripts/kib-spider.js
 *   node scripts/kib-spider.js --limit 5
 *   node scripts/kib-spider.js --only 小芽狐
 *   node scripts/kib-spider.js --force-images
 *   node scripts/kib-spider.js --prune
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as cheerio from 'cheerio'
import { pinyin } from 'pinyin-pro'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'src/data/qibos')
const IMAGE_DIR = join(ROOT, 'public/imgs/qibos')
const IMAGE_PUBLIC_PATH = '/imgs/qibos'

const LIST_URL = 'https://wiki.biligame.com/ap/%E5%A5%87%E6%B3%A2%E4%B8%80%E8%A7%88'
const ORIGIN = 'https://wiki.biligame.com'
const PIXEL_SELECTOR = 'img.kibo-pixelimg.tab-pane.kibo-tab-normall.active'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const args = parseArgs(process.argv.slice(2))

function parseArgs(argv) {
  const out = { limit: 0, only: '', forceImages: false, prune: false, delay: 350 }
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
  return `/** ${data.name} NO.${data.no} */\nexport default ${serialize(data)}\n`
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

function parseNo(text) {
  const raw = String(text || '')
    .replace(/^NO\.\s*/i, '')
    .trim()
  if (!raw) return ''
  if (/^\d+$/.test(raw)) return Number(raw)
  return raw
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

function uniqueId(base, used, no) {
  let id = base || `qibo-${String(no).toLowerCase()}`
  if (!used.has(id)) return id
  const withNo = `${id}-${String(no).toLowerCase()}`
  if (!used.has(withNo)) return withNo
  let i = 2
  while (used.has(`${id}-${i}`)) i += 1
  return `${id}-${i}`
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

function pickElements(e1, e2) {
  return [e1, e2].map((item) => String(item || '').trim()).filter((item) => item && item !== '空')
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
  $('.divsort.ap-kibo-child').each((_, node) => {
    const $el = $(node)
    const name = $el.find('.kibo-name').first().text().trim()
    const href = $el.find('a[href]').first().attr('href') || ''
    if (!name || !href) return
    list.push({
      name,
      no: parseNo($el.find('.kibo-number').first().text()),
      href,
      wikiSlug: wikiSlugFromHref(href),
      wikiUrl: absoluteUrl(href),
      elements: pickElements($el.attr('data-e1'), $el.attr('data-e2')),
      race: String($el.attr('data-param3') || '').trim(),
      stage: String($el.attr('data-param4') || '').trim(),
      sizeType: String($el.attr('data-param5') || '').trim(),
      shiny: String($el.attr('data-param6') || '').trim() === '有',
      special: String($el.attr('data-param7') || '').trim() === '是',
    })
  })
  return list
}

function parseSkills($) {
  const skills = []
  const seen = new Set()
  $('.kibo-skill-box .apskill.skill-box').each((_, node) => {
    const $box = $(node)
    const name = $box.find('.skill-name').first().text().trim()
    if (!name || seen.has(name)) return
    seen.add(name)
    const maxLevel = Number($box.attr('data-max-level') || 0) || undefined
    const levels = []
    $box.find('.apskill-data [data-level]').each((__, lvNode) => {
      const $lv = $(lvNode)
      const level = Number($lv.attr('data-level'))
      const desc = textWithBreaks($, $lv)
      if (!level || !desc) return
      levels.push({ level, desc })
    })
    levels.sort((a, b) => a.level - b.level)
    const desc =
      textWithBreaks($, $box.find('.apskill-desc.skill-desc').first()) ||
      levels.at(-1)?.desc ||
      ''
    skills.push({
      name,
      ...(maxLevel ? { maxLevel } : {}),
      desc,
      ...(levels.length ? { levels } : {}),
    })
  })
  return skills
}

function parseProperties($) {
  const properties = []
  const seen = new Set()
  $('.kibo-skill-box .property-box').each((_, node) => {
    const $box = $(node)
    const name = $box.find('.property-name').first().text().trim()
    const desc = textWithBreaks($, $box.find('.property-desc').first())
    if (!name || seen.has(name)) return
    seen.add(name)
    properties.push({ name, desc })
  })
  return properties
}

function parseHome($) {
  const $home = $('.kibo-home').first()
  if (!$home.length) return { homeJobs: [], drops: [] }
  const raw = textWithBreaks($, $home)
  const jobMatch = raw.match(/家园工种：([^\n掉落]*)/)
  const homeJobs = jobMatch
    ? jobMatch[1]
        .split(/[、,，]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : []
  const drops = []
  $home.find('.common_item-name').each((_, node) => {
    const name = $(node).text().trim()
    if (name) drops.push(name)
  })
  return { homeJobs, drops }
}

function parseEvolutions($) {
  const evolutions = []
  const seen = new Set()
  $('.kibo-rank-box .ap-kibo-child').each((_, node) => {
    const $el = $(node)
    const name = $el.find('.kibo-name').first().text().trim()
    if (!name || seen.has(name)) return
    seen.add(name)
    const href = $el.find('a[href]').first().attr('href') || ''
    const stage = $el.parent().find('.rank-stage').first().text().trim()
    evolutions.push({
      name,
      no: parseNo($el.find('.kibo-number').first().text()),
      ...(stage ? { stage } : {}),
      ...(href ? { wikiSlug: wikiSlugFromHref(href) } : {}),
    })
  })
  return evolutions
}

function parsePixel($) {
  const $img = $(PIXEL_SELECTOR).first()
  if (!$img.length) return { pixelImageUrl: '', width: 0, height: 0 }
  const src = $img.attr('src') || $img.attr('data-src') || ''
  return {
    pixelImageUrl: absoluteUrl(src),
    width: Number($img.attr('data-file-width') || $img.attr('width') || 0) || 0,
    height: Number($img.attr('data-file-height') || $img.attr('height') || 0) || 0,
  }
}

function parseDetail(html, listed) {
  const $ = cheerio.load(html)
  const labels = {}
  $('.kibo-label-box .kibo-label').each((_, node) => {
    const $label = $(node)
    const key = $label.clone().children().remove().end().text().replace(/[：:]/g, '').trim()
    const value = $label.find('span').first().text().trim()
    if (key) labels[key] = value
  })
  const intro = textWithBreaks($, $('.kibo-info-box .kibo-dec').first())
  const obtain = textWithBreaks($, $('.kibo-get').first()).replace(/^获取方式\s*/, '')
  const { homeJobs, drops } = parseHome($)
  const pixel = parsePixel($)
  const labeledElements = pickElements(
    ...(String(labels['元素'] || '').split(/[\/、,，]/).map((item) => item.trim())),
  )
  return {
    battleTag: labels['标签'] || '',
    race: labels['种族'] || listed.race || '',
    height: labels['身高'] || '',
    stage: labels['阶段'] || listed.stage || '',
    sizeType: labels['体型'] || listed.sizeType || '',
    intro,
    obtain,
    homeJobs,
    drops,
    skills: parseSkills($),
    properties: parseProperties($),
    evolutions: parseEvolutions($),
    elements: listed.elements?.length ? listed.elements : labeledElements,
    pixelImageUrl: pixel.pixelImageUrl,
    imageWidth: pixel.width || undefined,
    imageHeight: pixel.height || undefined,
  }
}

function buildRecord(listed, detail, id, imagePath) {
  return {
    id,
    no: listed.no,
    name: listed.name,
    wikiSlug: listed.wikiSlug,
    wikiUrl: listed.wikiUrl,
    elements: detail.elements?.length ? detail.elements : listed.elements,
    battleTag: detail.battleTag,
    race: detail.race,
    height: detail.height,
    stage: detail.stage,
    sizeType: detail.sizeType,
    shiny: listed.shiny,
    special: listed.special,
    obtain: detail.obtain,
    intro: detail.intro,
    image: imagePath,
    pixelImageUrl: detail.pixelImageUrl,
    ...(detail.imageWidth ? { imageWidth: detail.imageWidth } : {}),
    ...(detail.imageHeight ? { imageHeight: detail.imageHeight } : {}),
    homeJobs: detail.homeJobs,
    drops: detail.drops,
    skills: detail.skills,
    properties: detail.properties,
    evolutions: detail.evolutions,
  }
}

async function downloadPixel(url, id, existing, force) {
  if (!url) return { image: existing?.image || '', skipped: true, reason: 'no-url' }
  const prevUrl = existing?.pixelImageUrl
  const prevImage = existing?.image || ''
  const prevAbs = prevImage ? join(ROOT, 'public', prevImage.replace(/^\//, '')) : ''
  if (!force && prevUrl === url && prevAbs && existsSync(prevAbs)) {
    return { image: prevImage, skipped: true, reason: 'unchanged' }
  }
  const { buf, contentType } = await fetchBuffer(url)
  const ext = extFromUrlOrType(url, contentType)
  const filename = `${id}${ext}`
  await mkdir(IMAGE_DIR, { recursive: true })
  await writeFile(join(IMAGE_DIR, filename), buf)
  if (prevAbs && existsSync(prevAbs) && !prevAbs.endsWith(filename)) {
    await rm(prevAbs, { force: true })
  }
  return { image: `${IMAGE_PUBLIC_PATH}/${filename}`, skipped: false }
}

async function writeQiboFile(data) {
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
  return uniqueId(slugifyId(listed.wikiSlug || listed.name), used, listed.no)
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
  console.log('[kib-spider] 读取奇波一览…')
  const listHtml = await fetchText(LIST_URL)
  let listed = parseList(listHtml)
  if (!listed.length) throw new Error('列表页未解析到奇波，页面结构可能已变化')

  if (args.only) {
    listed = listed.filter(
      (item) => item.name === args.only || item.wikiSlug === args.only || String(item.no) === args.only,
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

  for (let i = 0; i < listed.length; i += 1) {
    const item = listed[i]
    const label = `[${i + 1}/${listed.length}] ${item.name} (NO.${item.no})`
    try {
      if (i) await sleep(args.delay)
      const html = await fetchText(item.wikiUrl)
      const detail = parseDetail(html, item)
      const prev = existing.bySlug.get(item.wikiSlug) || existing.byId.get(item.id)
      const imageResult = await downloadPixel(detail.pixelImageUrl, item.id, prev, args.forceImages)
      if (imageResult.skipped) stats.imageSkip += 1
      else stats.images += 1
      const record = buildRecord(item, detail, item.id, imageResult.image)
      const written = await writeQiboFile(record)
      if (written.changed) stats.written += 1
      else stats.unchanged += 1
      keepIds.add(record.id)
      if (record.image) keepImages.add(record.image)
      const imgNote = imageResult.skipped ? `图跳过(${imageResult.reason})` : '已下载图'
      console.log(`${label} ${written.changed ? '已更新' : '无变化'} ${imgNote}`)
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
    console.log(`[kib-spider] 已清理过期文件 ${pruned.files}、图片 ${pruned.images}`)
  }

  console.log(
    `[kib-spider] 完成：写入 ${stats.written}，未变 ${stats.unchanged}，下载图片 ${stats.images}，跳过图片 ${stats.imageSkip}，失败 ${stats.failed}`,
  )
  if (stats.failed) process.exitCode = 1
}

main().catch((error) => {
  console.error('[kib-spider] 中止:', error)
  process.exit(1)
})
