<script setup>
import { reactive, ref } from 'vue';
import { api, requestId } from '../api.js';
const model = defineModel({ type: Boolean });
const emit = defineEmits(['submitted', 'expired']);
const empty = () => ({ request_id: requestId(), verse: '', title: '', author: '', meaning: '', original: '', source_url: '' });
const form = reactive(empty());
const busy = ref(false);
const error = ref('');
async function submit() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    await api('/submissions', { method: 'POST', body: form });
    Object.assign(form, empty()); model.value = false; emit('submitted');
  } catch (failure) {
    error.value = failure.message;
    if (failure.status === 401) emit('expired');
  } finally { busy.value = false; }
}
</script>
<template>
  <el-dialog v-model="model" title="分享一句好诗" width="620px" class="paper-dialog" :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy">
    <p class="dialog-intro">投稿经审核通过后，会加入抽签池。请核对诗句、出处和解读。</p>
    <el-form label-position="top" @submit.prevent="submit" :disabled="busy">
      <el-form-item label="诗句（必填）"><el-input v-model="form.verse" type="textarea" :rows="2" maxlength="60" show-word-limit placeholder="适合写在诗签上的一句诗" /></el-form-item>
      <div class="form-columns"><el-form-item label="作品名称（必填）"><el-input v-model="form.title" maxlength="120" placeholder="如：望岳" /></el-form-item><el-form-item label="作者（必填）"><el-input v-model="form.author" maxlength="80" placeholder="如：唐 · 杜甫" /></el-form-item></div>
      <el-form-item label="诗意解读（必填）"><el-input v-model="form.meaning" type="textarea" :rows="3" maxlength="2000" show-word-limit placeholder="用自己的话解释诗意" /></el-form-item>
      <el-form-item label="原文（选填）"><el-input v-model="form.original" type="textarea" :rows="3" maxlength="5000" show-word-limit placeholder="完整原文或连续节选，未填写时使用投稿诗句" /></el-form-item>
      <el-form-item label="来源链接（选填）"><el-input v-model="form.source_url" type="url" maxlength="1000" placeholder="https://…" /></el-form-item>
      <el-alert v-if="error" :title="error" type="error" :closable="false" role="alert" />
      <div class="form-actions"><el-button @click="model = false">暂不提交</el-button><el-button type="primary" native-type="submit" :loading="busy">提交审核</el-button></div>
    </el-form>
  </el-dialog>
</template>
