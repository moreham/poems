<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { api } from '../api.js';
const props = defineProps({ poem: String, drawId: String });
const count = ref(null), liked = ref(false), ready = ref(false), busy = ref(false), error = ref(''), pending = ref(null);
let revision = 0, controller, timer;
async function load(write = false) {
  if (!props.poem || busy.value || (!write && pending.value !== null) || (write && !ready.value)) return;
  const version = revision;
  controller?.abort(); controller = new AbortController();
  const request = controller;
  if (write) { pending.value ??= !liked.value; busy.value = true; }
  const timeout = setTimeout(() => request.abort(), 10000);
  try {
    const result = await api(`/likes${write ? '' : `?${new URLSearchParams({ poem: props.poem, draw_id: props.drawId })}`}`, {
      method: write ? 'POST' : 'GET', signal: request.signal,
      body: write ? { poem: props.poem, draw_id: props.drawId, liked: pending.value } : undefined
    });
    if (version !== revision) return;
    count.value = result.count; liked.value = result.liked; ready.value = true; error.value = '';
    if (write) pending.value = null;
  } catch (failure) {
    if (version !== revision || request !== controller) return;
    error.value = write ? `${pending.value ? '点赞' : '取消点赞'}未确认，请点击重试。` : '点赞数暂时无法加载，稍后自动重试。';
  } finally {
    clearTimeout(timeout);
    if (version === revision && request === controller) busy.value = false;
  }
}
watch(() => props.drawId, () => {
  revision++; controller?.abort(); count.value = null; liked.value = false; ready.value = false; busy.value = false; pending.value = null; error.value = ''; load();
}, { immediate: true });
function visible() { if (!document.hidden) load(); }
onMounted(() => { timer = setInterval(visible, 30000); document.addEventListener('visibilitychange', visible); });
onUnmounted(() => { revision++; controller?.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); });
</script>
<template>
  <section class="likes" aria-label="诗签点赞">
    <button id="like-button" class="like-button" type="button" :disabled="!ready || busy" :aria-pressed="liked" :aria-busy="busy" :aria-label="pending !== null ? (pending ? '重试点赞' : '重试取消点赞') : liked ? '取消点赞' : '喜欢这签'" @click="load(true)">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21S3 15.4 3 8.8C3 3.8 9 2.4 12 6c3-3.6 9-2.2 9 2.8C21 15.4 12 21 12 21Z" /></svg><span id="like-count" class="like-count">{{ count === null ? '—' : count.toLocaleString('zh-CN') }}</span>
    </button><p v-if="error" id="like-status" class="likes__status" role="status">{{ error }}</p>
  </section>
</template>
