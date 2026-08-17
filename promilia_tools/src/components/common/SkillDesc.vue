<script setup>
import { useSlots } from 'vue'

const ELEMENT_CLASS = {
  火: 'fire',
  风: 'wind',
  地: 'earth',
  木: 'wood',
  冰: 'ice',
  水: 'water',
  雷: 'thunder',
  光: 'light',
  暗: 'dark',
  无: 'void',
}

const TOKEN_RE_SOURCE =
  '(【[^】]*】)|(\\d+(?:\\.\\d+)?[%％])|(\\d+(?:\\.\\d+)?)|([火风地木冰水雷光暗无])'

const slots = useSlots()

function extractText(nodes) {
  if (!nodes?.length) return ''
  let out = ''
  for (const node of nodes) {
    if (node == null) continue
    if (typeof node === 'string' || typeof node === 'number') {
      out += String(node)
      continue
    }
    if (typeof node.children === 'string') {
      out += node.children
    } else if (Array.isArray(node.children)) {
      out += extractText(node.children)
    }
  }
  return out
}

function parse(text) {
  if (!text) return []
  const re = new RegExp(TOKEN_RE_SOURCE, 'g')
  const segments = []
  let last = 0
  for (const match of text.matchAll(re)) {
    if (match.index > last) {
      segments.push({ type: 'text', text: text.slice(last, match.index) })
    }
    if (match[1]) {
      segments.push({ type: 'bracket', text: match[1] })
    } else if (match[2]) {
      segments.push({ type: 'percent', text: match[2] })
    } else if (match[3]) {
      segments.push({ type: 'number', text: match[3] })
    } else {
      segments.push({
        type: 'element',
        text: match[4],
        name: ELEMENT_CLASS[match[4]],
      })
    }
    last = match.index + match[0].length
  }
  if (last < text.length) {
    segments.push({ type: 'text', text: text.slice(last) })
  }
  return segments
}

function segments() {
  return parse(extractText(slots.default?.() ?? []))
}
</script>

<template>
  <p class="skill-desc">
    <template v-for="(seg, i) in segments()" :key="i">
      <span v-if="seg.type === 'element'" :class="['el', `el-${seg.name}`]">{{ seg.text }}</span>
      <span v-else-if="seg.type === 'percent'" class="num-percent">{{ seg.text }}</span>
      <span v-else-if="seg.type === 'number'" class="num">{{ seg.text }}</span>
      <span v-else-if="seg.type === 'bracket'" class="bracket">{{ seg.text }}</span>
      <template v-else>{{ seg.text }}</template>
    </template>
  </p>
</template>

<style scoped lang="scss">
.skill-desc {
  margin: 6px 0 0;
  line-height: 1.75;
  color: var(--c-text-muted);
  white-space: pre-line;
}

.el {
  font-weight: 700;
  text-shadow: 0 0 10px color-mix(in srgb, currentColor 50%, transparent);
}

.el-fire {
  color: #ff5c4d;
}
.el-wind {
  color: #ff9a2e;
}
.el-earth {
  color: #f0bc2e;
}
.el-wood {
  color: #4caf50;
}
.el-ice {
  color: #2ad4dc;
}
.el-water {
  color: #3b9bff;
}
.el-thunder {
  color: #7b86f0;
}
.el-light {
  color: #ffe44a;
}
.el-dark {
  color: #c44ed4;
}
.el-void {
  color: #a8b4bc;
}

.num-percent {
  font-weight: 700;
  color: var(--c-text);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1.5px;
}

.num {
  font-weight: 700;
  color: var(--c-text);
}

.bracket {
  font-weight: 600;
  color: #c084fc;
  text-shadow: 0 0 8px rgba(192, 132, 252, 0.35);
}
</style>
