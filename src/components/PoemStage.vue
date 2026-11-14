<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import initialPoems from '../../server/data/poems.json';
import { api, requestId } from '../api.js';
import LikeButton from './LikeButton.vue';
const pool = ref(initialPoems.map(item => ({ ...item, source_url: item.url })));
const poem = ref(pool.value[randomIndex(pool.value.length)]);
const flipped = ref(false), drawing = ref(false), drawId = ref(requestId().replaceAll('-', '')), verse = ref(null), reading = ref(null);
const poolError = ref('');
let timer, resizeObserver;
function randomIndex(max) {
  const values = new Uint32Array(1), limit = 0x100000000 - (0x100000000 % max);
  do { crypto.getRandomValues(values); } while (values[0] >= limit);
  return values[0] % max;
}
const columns = computed(() => {
  const segments = poem.value.verse.match(/[^，\n]+[，]?/gu) || [poem.value.verse];
  const chunks = [];
  for (const segment of segments) {
    const chars = Array.from(segment);
    while (chars.length) chunks.push(chars.splice(0, 14));
  }
  return chunks;
});
function fit() {
  if (!verse.value) return;
  const longest = Math.max(...columns.value.map(column => column.length));
  const gap = parseFloat(getComputedStyle(verse.value).columnGap) || 0;
  const size = Math.min(35, Math.max(27, innerWidth * .074), verse.value.clientHeight / (longest * 1.3),
    (verse.value.clientWidth - gap * (columns.value.length - 1)) / (columns.value.length * 1.3));
  verse.value.style.fontSize = `${Math.max(10, size)}px`;
}
async function draw() {
  if (drawing.value) return;
  let next = poem.value;
  if (pool.value.length > 1) do { next = pool.value[randomIndex(pool.value.length)]; } while (next.verse === poem.value.verse);
  drawing.value = true; flipped.value = false; poem.value = next; drawId.value = requestId().replaceAll('-', '');
  await nextTick(); fit();
  clearTimeout(timer); timer = setTimeout(() => { drawing.value = false; }, 620);
}
async function refreshPool() {
  if (document.hidden) return;
  try { const result = await api('/poems'); if (result.poems.length) pool.value = result.poems; poolError.value = ''; }
  catch { poolError.value = '新诗签暂时未能同步，仍可抽取已有诗签。'; }
}
function flip() { flipped.value = !flipped.value; if (reading.value) reading.value.scrollTop = 0; }
onMounted(async () => {
  refreshPool(); await nextTick(); fit();
  document.fonts?.ready.then(fit);
  resizeObserver = new ResizeObserver(fit); resizeObserver.observe(verse.value);
  window.addEventListener('resize', fit); document.addEventListener('visibilitychange', refreshPool);
});
onUnmounted(() => { clearTimeout(timer); resizeObserver?.disconnect(); window.removeEventListener('resize', fit); document.removeEventListener('visibilitychange', refreshPool); });
</script>
<template>
  <main class="app-shell">
    <section class="draw-stage" aria-label="诗词签卡">
      <article id="sign-card" class="sign-card" :class="{ 'is-flipped': flipped, 'is-drawing': drawing, 'is-resetting': drawing }" aria-label="诗签">
        <div class="sign-card__inner">
          <div id="sign-front" class="sign-card__face sign-card__front" :aria-hidden="flipped" :inert="flipped">
            <div class="sign-card__grain" aria-hidden="true"></div>
            <div ref="verse" id="verse" class="verse" aria-live="polite" :aria-label="poem.verse"><span class="verse__column" v-for="(column, i) in columns" :key="`${drawId}-${i}`"><span class="verse__char" v-for="(char, j) in column" :key="j" :style="{ '--char-index': columns.slice(0, i).reduce((sum, item) => sum + item.length, 0) + j }">{{ char }}</span></span></div>
          </div>
          <section id="sign-back" class="sign-card__face sign-card__back" aria-label="诗签解读" :aria-hidden="!flipped" :inert="!flipped">
            <div ref="reading" id="reading" class="reading" tabindex="0" @keydown.esc="flipped = false">
              <p class="reading__eyebrow">出处</p><h2 id="reading-title">{{ poem.title }}</h2><p id="reading-author" class="reading__author">{{ poem.author }}</p>
              <h3>诗意</h3><p id="reading-meaning">{{ poem.meaning }}</p><h3 id="reading-original-label">{{ poem.excerpt ? '原文（节选）' : '原文' }}</h3><p id="reading-original" class="reading__original">{{ poem.original }}</p>
              <a v-if="poem.source_url" id="reading-source" :href="poem.source_url" target="_blank" rel="noopener noreferrer">查阅原文 ↗</a>
            </div>
          </section>
        </div>
      </article>
    </section>
    <LikeButton :poem="poem.verse" :draw-id="drawId" />
    <section class="controls" aria-label="抽签操作"><button id="interpret-button" class="interpret-button" type="button" aria-controls="sign-back" :aria-expanded="flipped" :disabled="drawing" @click="flip">{{ flipped ? '返回签面' : '一键解读' }}</button><button id="draw-button" class="draw-button" type="button" :disabled="drawing" @click="draw"><span class="draw-button__mark" aria-hidden="true">签</span><span>再抽一签</span></button></section>
    <p v-if="poolError" class="likes__status" role="status">{{ poolError }}</p>
  </main>
</template>
