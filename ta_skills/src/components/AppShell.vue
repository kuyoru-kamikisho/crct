<template>
  <div class="shell">
    <aside class="side" :class="{ open: sideOpen }">
      <div class="brand" @click="$router.push('/')">
        <i class="mdi mdi-cube-scan"></i>
        <div>
          <strong>TA Skills</strong>
          <span>技术美术自学站</span>
        </div>
      </div>
      <nav>
        <RouterLink to="/" class="nav-item" active-class="" exact-active-class="router-link-active" @click="sideOpen = false">
          <i class="mdi mdi-home-outline"></i>首页
        </RouterLink>
        <RouterLink to="/learn" class="nav-item" @click="sideOpen = false">
          <i class="mdi mdi-map-marker-path"></i>学习路线
        </RouterLink>
        <div v-for="ch in chapters" :key="ch.id" class="chapter">
          <button class="ch-btn" @click="toggle(ch.id)">
            <i class="mdi" :class="ch.icon"></i>
            <span>{{ ch.title }}</span>
            <i class="mdi mdi-chevron-down caret" :class="{ rot: open[ch.id] }"></i>
          </button>
          <div v-show="open[ch.id]" class="ch-list">
            <RouterLink
              v-for="a in articlesOf(ch.id)"
              :key="a.slug"
              :to="'/learn/' + a.slug"
              class="art-link"
              @click="sideOpen = false"
            >
              {{ a.title }}
            </RouterLink>
          </div>
        </div>
        <RouterLink to="/problems" class="nav-item" @click="sideOpen = false">
          <i class="mdi mdi-alert-circle-outline"></i>工作问题
        </RouterLink>
        <RouterLink to="/interview" class="nav-item" @click="sideOpen = false">
          <i class="mdi mdi-comment-question-outline"></i>面试题
        </RouterLink>
        <RouterLink to="/tools" class="nav-item" @click="sideOpen = false">
          <i class="mdi mdi-download-outline"></i>工具下载
        </RouterLink>
        <RouterLink to="/community" class="nav-item" @click="sideOpen = false">
          <i class="mdi mdi-account-group-outline"></i>作品集社区
        </RouterLink>
      </nav>
    </aside>
    <div class="main">
      <header class="top">
        <button class="icon-btn menu" @click="sideOpen = !sideOpen" aria-label="菜单">
          <i class="mdi mdi-menu"></i>
        </button>
        <button class="search-btn" @click="searchOpen = true">
          <i class="mdi mdi-magnify"></i>
          <span>搜索知识点、面试题、工具…</span>
          <kbd>Ctrl</kbd><kbd>K</kbd>
        </button>
      </header>
      <div class="content">
        <RouterView />
      </div>
    </div>
    <div v-if="sideOpen" class="mask" @click="sideOpen = false"></div>
    <SearchModal v-model="searchOpen" />
  </div>
</template>

<script>
import { articlesOf, chapters, findArticle } from '../data/knowledge.js'
import SearchModal from './SearchModal.vue'

export default {
  components: { SearchModal },
  data() {
    return {
      chapters,
      sideOpen: false,
      searchOpen: false,
      open: { math: true, gfx: true, shading: true, practice: true }
    }
  },
  watch: {
    '$route.path': {
      immediate: true,
      handler() {
        const slug = this.$route.params.slug
        const art = slug && findArticle(slug)
        if (art) this.open[art.chapter] = true
      }
    }
  },
  mounted() {
    window.addEventListener('keydown', this.onKey)
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey)
  },
  methods: {
    articlesOf,
    toggle(id) {
      this.open[id] = !this.open[id]
    },
    onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        this.searchOpen = true
      }
      if (e.key === 'Escape') this.searchOpen = false
    }
  }
}
</script>

<style scoped>
.shell {
  display: flex;
  min-height: 100vh;
}
.side {
  width: var(--sidebar-w);
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  background: rgba(12, 14, 18, 0.92);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: auto;
  z-index: 20;
}
.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 16px 16px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
}
.brand i {
  font-size: 28px;
  color: var(--accent);
}
.brand strong {
  display: block;
  font-size: 15px;
}
.brand span {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
}
nav { padding: 8px 8px 24px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  color: var(--text);
  border-radius: var(--radius);
  text-decoration: none;
  font-size: 13px;
}
.nav-item i { color: var(--text-muted); font-size: 18px; }
.nav-item:hover { background: var(--bg-hover); text-decoration: none; }
.nav-item.router-link-active {
  background: var(--accent-soft);
  color: var(--accent);
}
.nav-item.router-link-active i { color: var(--accent); }
.ch-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  letter-spacing: 0.04em;
  border-radius: var(--radius);
}
.ch-btn:hover { background: var(--bg-hover); color: var(--text); }
.ch-btn i { font-size: 18px; }
.caret { margin-left: auto; transition: transform 0.15s; }
.caret.rot { transform: rotate(-180deg); }
.ch-list { padding: 0 0 8px 8px; }
.art-link {
  display: block;
  padding: 6px 10px 6px 28px;
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  border-radius: var(--radius);
  line-height: 1.4;
}
.art-link:hover { color: var(--text); background: var(--bg-hover); text-decoration: none; }
.art-link.router-link-active {
  color: var(--accent);
  background: var(--accent-soft);
}
.main { flex: 1; min-width: 0; }
.top {
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: rgba(11, 13, 18, 0.8);
  backdrop-filter: blur(10px);
  z-index: 10;
}
.search-btn {
  flex: 1;
  max-width: 560px;
  height: 34px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-dim);
  cursor: pointer;
  font-size: 13px;
}
.search-btn span { flex: 1; text-align: left; }
.search-btn kbd { margin-left: 2px; }
.icon-btn {
  display: none;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  border-radius: var(--radius);
  cursor: pointer;
}
.icon-btn i { font-size: 20px; }
.content { padding: 28px 32px 80px; }
.mask { display: none; }

@media (max-width: 900px) {
  .side {
    position: fixed;
    left: 0;
    transform: translateX(-100%);
    transition: transform 0.18s ease;
  }
  .side.open { transform: none; }
  .icon-btn.menu { display: inline-flex; align-items: center; justify-content: center; }
  .mask {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 15;
  }
  .content { padding: 20px 16px 64px; }
  .search-btn kbd { display: none; }
}
</style>
