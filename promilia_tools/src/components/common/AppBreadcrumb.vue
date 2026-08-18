<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
  label: {
    type: String,
    default: 'breadcrumb',
  },
})
</script>

<template>
  <nav class="crumbs" :aria-label="label">
    <ol>
      <li v-for="(item, i) in items" :key="`${item.label}-${i}`">
        <router-link v-if="item.to && i < items.length - 1" :to="item.to">{{ item.label }}</router-link>
        <span v-else aria-current="page">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped lang="scss">
.crumbs {
  margin: 0 0 14px;
  font-size: 12px;
  color: var(--c-text-muted);
}

ol {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

li:not(:last-child)::after {
  content: '/';
  margin-left: 6px;
  color: var(--c-border);
}

a {
  color: var(--c-accent-soft);

  &:hover {
    color: var(--c-accent);
  }
}

span[aria-current='page'] {
  color: var(--c-text);
}
</style>
