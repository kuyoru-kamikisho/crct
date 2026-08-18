import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildSeo, INDEXABLE_STATIC_PATHS, PLACEHOLDER_PATHS } from '../src/seo/meta.js'
import { CONFIGURED_SITE_URL } from '../src/seo/site.js'
import zhCN from '../src/i18n/locales/zh-CN.js'
import { qibos } from '../src/data/qibos.js'

function escapeAttr(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `    ${replacement}\n  </head>`)
}

function injectHead(html, seo) {
  let out = html
  out = out.replace(/<title[^>]*>[\s\S]*?<\/title>/, `<title>${escapeAttr(seo.title)}</title>`)
  out = replaceTag(
    out,
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeAttr(seo.description)}" />`,
  )
  out = replaceTag(
    out,
    /<meta\s+name="keywords"[^>]*>/i,
    `<meta name="keywords" content="${escapeAttr(seo.keywords)}" />`,
  )
  out = replaceTag(
    out,
    /<meta\s+name="robots"[^>]*>/i,
    `<meta name="robots" content="${escapeAttr(seo.robots)}" />`,
  )
  out = replaceTag(
    out,
    /<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${escapeAttr(seo.canonical)}" />`,
  )
  out = replaceTag(
    out,
    /<link\s+rel="alternate"\s+hreflang="zh-CN"[^>]*>/i,
    `<link rel="alternate" hreflang="zh-CN" href="${escapeAttr(seo.canonical)}" />`,
  )
  out = replaceTag(
    out,
    /<link\s+rel="alternate"\s+hreflang="x-default"[^>]*>/i,
    `<link rel="alternate" hreflang="x-default" href="${escapeAttr(seo.canonical)}" />`,
  )
  out = replaceTag(
    out,
    /<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${escapeAttr(seo.title)}" />`,
  )
  out = replaceTag(
    out,
    /<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${escapeAttr(seo.description)}" />`,
  )
  out = replaceTag(
    out,
    /<meta\s+property="og:type"[^>]*>/i,
    `<meta property="og:type" content="${escapeAttr(seo.ogType)}" />`,
  )
  out = replaceTag(
    out,
    /<meta\s+property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${escapeAttr(seo.canonical)}" />`,
  )
  if (seo.ogImage) {
    out = replaceTag(
      out,
      /<meta\s+property="og:image"[^>]*>/i,
      `<meta property="og:image" content="${escapeAttr(seo.ogImage)}" />`,
    )
    out = replaceTag(
      out,
      /<meta\s+property="og:image:alt"[^>]*>/i,
      `<meta property="og:image:alt" content="${escapeAttr(seo.ogImageAlt)}" />`,
    )
    out = replaceTag(
      out,
      /<meta\s+name="twitter:image"[^>]*>/i,
      `<meta name="twitter:image" content="${escapeAttr(seo.ogImage)}" />`,
    )
  }
  out = replaceTag(
    out,
    /<meta\s+name="twitter:card"[^>]*>/i,
    `<meta name="twitter:card" content="${seo.ogImage ? 'summary_large_image' : 'summary'}" />`,
  )
  out = replaceTag(
    out,
    /<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${escapeAttr(seo.title)}" />`,
  )
  out = replaceTag(
    out,
    /<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${escapeAttr(seo.description)}" />`,
  )
  const json = JSON.stringify(seo.jsonLd)
  out = out.replace(
    /<script type="application\/ld\+json" id="seo-jsonld">[\s\S]*?<\/script>/,
    `<script type="application/ld+json" id="seo-jsonld">${json}</script>`,
  )
  out = out.replace(
    /<noscript id="seo-noscript">[\s\S]*?<\/noscript>/,
    `<noscript id="seo-noscript">\n${seo.noscript}\n    </noscript>`,
  )
  return out
}

function fileForPath(outDir, routePath) {
  if (routePath === '/') return join(outDir, 'index.html')
  return join(outDir, `${routePath.replace(/^\//, '')}.html`)
}

async function loadCharacters(root) {
  const dir = join(root, 'src/data/characters')
  const files = await readdir(dir)
  const list = []
  for (const file of files) {
    if (!file.endsWith('.js')) continue
    const href = pathToFileURL(join(dir, file)).href
    const mod = await import(href)
    if (mod.default?.id) list.push(mod.default)
  }
  return list
}

function xmlEscape(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSitemap(siteUrl, urls) {
  const origin = String(siteUrl || '').replace(/\/+$/, '')
  const body = urls
    .map((u) => {
      const loc = origin ? `${origin}${u.path}` : u.path
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''
      return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmod}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

function buildRobots(siteUrl) {
  const origin = String(siteUrl || '').replace(/\/+$/, '')
  const sitemap = origin ? `${origin}/sitemap.xml` : '/sitemap.xml'
  return `User-agent: *\nAllow: /\n\nUser-agent: Baiduspider\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nSitemap: ${sitemap}\n`
}

function extensionlessHtmlMiddleware(root) {
  return async (req, _res, next) => {
    try {
      const [pathname, query] = (req.url || '/').split('?')
      const clean = decodeURIComponent(pathname || '/').replace(/\/+$/, '') || '/'
      if (clean === '/' || /\.[a-z0-9]+$/i.test(clean)) return next()
      await stat(join(root, `${clean}.html`))
      req.url = query ? `${clean}.html?${query}` : `${clean}.html`
    } catch {
      /* keep original url, SPA fallback will handle */
    }
    next()
  }
}

/**
 * 构建后为每个路由写出带独立 title/description/JSON-LD/noscript 的 HTML，
 * 并生成 sitemap.xml、robots.txt、GitHub Pages 用 404.html。
 */
export function seoPrerenderPlugin() {
  let outDir = ''
  let root = ''
  let siteUrl = ''
  let ran = false

  return {
    name: 'seo-prerender',
    configResolved(config) {
      root = config.root
      outDir = join(config.root, config.build.outDir)
      siteUrl = String(config.env.VITE_SITE_URL || CONFIGURED_SITE_URL || '').replace(/\/+$/, '')
    },
    configurePreviewServer(server) {
      server.middlewares.use(extensionlessHtmlMiddleware(outDir || join(root, 'dist')))
    },
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        await prerender()
      },
    },
  }

  async function prerender() {
      if (ran) return
      ran = true
      const indexPath = join(outDir, 'index.html')
      let template
      try {
        template = await readFile(indexPath, 'utf8')
      } catch {
        console.warn('[seo] dist/index.html 不存在，跳过预渲染')
        return
      }

      const characters = await loadCharacters(root)
      const today = new Date().toISOString().slice(0, 10)
      const jobs = []

      for (const item of INDEXABLE_STATIC_PATHS) {
        jobs.push({
          path: item.path,
          name: item.name,
          changefreq: item.changefreq,
          priority: item.priority,
          lastmod: today,
          noindex: false,
        })
      }
      for (const character of characters) {
        jobs.push({
          path: `/encyclopedia/characters/${character.id}`,
          name: 'character-detail',
          character,
          changefreq: 'weekly',
          priority: '0.8',
          lastmod: today,
          noindex: false,
        })
      }
      for (const path of PLACEHOLDER_PATHS) {
        jobs.push({
          path,
          name: 'placeholder',
          changefreq: 'monthly',
          priority: '0.2',
          lastmod: today,
          noindex: true,
        })
      }

      for (const job of jobs) {
        const seo = buildSeo({
          path: job.path,
          routeName: job.name,
          siteUrl,
          messages: zhCN,
          character: job.character || null,
          characters,
          qibos,
          noindex: job.noindex,
        })
        const html = injectHead(template, seo)
        const file = fileForPath(outDir, job.path)
        await mkdir(dirname(file), { recursive: true })
        await writeFile(file, html, 'utf8')
      }

      const notFoundSeo = buildSeo({
        path: '/404',
        routeName: 'not-found',
        siteUrl,
        messages: zhCN,
        characters,
        qibos,
        noindex: true,
      })
      await writeFile(join(outDir, '404.html'), injectHead(template, notFoundSeo), 'utf8')

      const sitemapUrls = jobs
        .filter((j) => !j.noindex)
        .map((j) => ({
          path: j.path,
          changefreq: j.changefreq,
          priority: j.priority,
          lastmod: j.lastmod,
        }))
      await writeFile(join(outDir, 'sitemap.xml'), buildSitemap(siteUrl, sitemapUrls), 'utf8')
      await writeFile(join(outDir, 'robots.txt'), buildRobots(siteUrl), 'utf8')

      const indexed = sitemapUrls.length
      console.info(
        `[seo] 已预渲染 ${jobs.length} 个页面（收录 ${indexed}），sitemap ${siteUrl ? '含绝对地址' : '为根相对路径，建议设置 VITE_SITE_URL'}`,
      )
  }
}
