import { defineStore } from 'pinia'
import {
  WikiApiError,
  fetchCharacter,
  fetchCharacters,
  fetchItem,
  fetchItems,
  fetchQibo,
  fetchQibos,
  fetchWikiNav,
} from '@/api/wiki'
import { buildNavSections } from '@/data/navigation'
import { ALL_ITEMS_SOURCE_ID, buildItemSourceCatalog, getItemSourceById } from '@/data/itemSources'

const inflight = new Map()

function once(key, run) {
  if (!inflight.has(key)) {
    inflight.set(
      key,
      Promise.resolve()
        .then(run)
        .finally(() => inflight.delete(key)),
    )
  }
  return inflight.get(key)
}

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    characters: [],
    items: [],
    qibos: [],
    nav: null,
    currentCharacter: null,
    currentQibo: null,
    currentQiboPrev: null,
    currentQiboNext: null,
    currentItem: null,
    currentItemPrev: null,
    currentItemNext: null,
    loading: {
      nav: false,
      characters: false,
      items: false,
      qibos: false,
      character: false,
      item: false,
      qibo: false,
    },
    error: {
      nav: '',
      characters: '',
      items: '',
      qibos: '',
      character: '',
      item: '',
      qibo: '',
    },
    loaded: {
      nav: false,
      characters: false,
      items: false,
      qibos: false,
    },
  }),
  getters: {
    encyclopediaStats: (state) =>
      state.nav?.stats || {
        characters: state.characters.length,
        qibos: state.qibos.length,
        items: state.items.length,
      },
    characterSummaries: (state) =>
      state.nav?.characters ||
      state.characters.map((item) => ({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn || '',
      })),
    qiboSummaries: (state) =>
      state.nav?.qibos ||
      state.qibos.map((item) => ({
        id: item.id,
        name: item.name,
        no: item.no ?? null,
      })),
    featuredItemNames: (state) => state.nav?.featuredItemNames || [],
    itemSourceCatalog: (state) =>
      state.nav?.itemSources || (state.items.length ? buildItemSourceCatalog(state.items) : []),
    navSections: (state) => buildNavSections(state.itemSourceCatalog),
  },
  actions: {
    async ensureNav() {
      if (this.loaded.nav) return this.nav
      this.loading.nav = true
      return once('nav', async () => {
        this.error.nav = ''
        try {
          this.nav = await fetchWikiNav()
          this.loaded.nav = true
          return this.nav
        } catch (error) {
          this.error.nav = error instanceof WikiApiError ? error.code : 'FAIL'
          throw error
        } finally {
          this.loading.nav = false
        }
      })
    },
    async ensureCharacters() {
      if (this.loaded.characters) return this.characters
      this.loading.characters = true
      return once('characters', async () => {
        this.error.characters = ''
        try {
          this.characters = await fetchCharacters()
          this.loaded.characters = true
          return this.characters
        } catch (error) {
          this.error.characters = error instanceof WikiApiError ? error.code : 'FAIL'
          throw error
        } finally {
          this.loading.characters = false
        }
      })
    },
    async ensureItems() {
      if (this.loaded.items) return this.items
      this.loading.items = true
      return once('items', async () => {
        this.error.items = ''
        try {
          this.items = await fetchItems()
          this.loaded.items = true
          return this.items
        } catch (error) {
          this.error.items = error instanceof WikiApiError ? error.code : 'FAIL'
          throw error
        } finally {
          this.loading.items = false
        }
      })
    },
    async ensureQibos() {
      if (this.loaded.qibos) return this.qibos
      this.loading.qibos = true
      return once('qibos', async () => {
        this.error.qibos = ''
        try {
          this.qibos = await fetchQibos()
          this.loaded.qibos = true
          return this.qibos
        } catch (error) {
          this.error.qibos = error instanceof WikiApiError ? error.code : 'FAIL'
          throw error
        } finally {
          this.loading.qibos = false
        }
      })
    },
    async loadCharacter(id) {
      const key = String(id || '')
      this.loading.character = true
      return once(`character:${key}`, async () => {
        this.error.character = ''
        this.currentCharacter = null
        try {
          this.currentCharacter = await fetchCharacter(key)
          return this.currentCharacter
        } catch (error) {
          this.currentCharacter = null
          this.error.character = error instanceof WikiApiError ? error.code : 'FAIL'
          if (error instanceof WikiApiError && error.code === 'NOT_FOUND') return null
          throw error
        } finally {
          this.loading.character = false
        }
      })
    },
    async loadQibo(id) {
      const key = String(id || '')
      this.loading.qibo = true
      return once(`qibo:${key}`, async () => {
        this.error.qibo = ''
        this.currentQibo = null
        this.currentQiboPrev = null
        this.currentQiboNext = null
        try {
          const data = await fetchQibo(key)
          this.currentQibo = data.qibo
          this.currentQiboPrev = data.prev
          this.currentQiboNext = data.next
          return data
        } catch (error) {
          this.currentQibo = null
          this.error.qibo = error instanceof WikiApiError ? error.code : 'FAIL'
          if (error instanceof WikiApiError && error.code === 'NOT_FOUND') return null
          throw error
        } finally {
          this.loading.qibo = false
        }
      })
    },
    async loadItem(id, from) {
      const key = String(id || '')
      const source = String(from || '')
      this.loading.item = true
      return once(`item:${key}:${source}`, async () => {
        this.error.item = ''
        this.currentItem = null
        this.currentItemPrev = null
        this.currentItemNext = null
        try {
          const data = await fetchItem(key, { from: source || undefined })
          this.currentItem = data.item
          this.currentItemPrev = data.prev
          this.currentItemNext = data.next
          return data
        } catch (error) {
          this.currentItem = null
          this.error.item = error instanceof WikiApiError ? error.code : 'FAIL'
          if (error instanceof WikiApiError && error.code === 'NOT_FOUND') return null
          throw error
        } finally {
          this.loading.item = false
        }
      })
    },
    getItemSource(id) {
      return getItemSourceById(this.itemSourceCatalog, id || ALL_ITEMS_SOURCE_ID)
    },
  },
})
