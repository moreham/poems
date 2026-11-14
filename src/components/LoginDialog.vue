<script setup>
import { ref, onUnmounted } from 'vue';
import { api } from '../api.js';
const model = defineModel({ type: Boolean });
const emit = defineEmits(['logged-in']);
const email = ref('');
const code = ref('');
const sending = ref(false);
const loggingIn = ref(false);
const countdown = ref(0);
const message = ref('');
const error = ref('');
let timer;
function count(seconds) {
  clearInterval(timer); countdown.value = seconds;
  timer = setInterval(() => { if (--countdown.value <= 0) clearInterval(timer); }, 1000);
}
async function send() {
  if (sending.value || countdown.value) return;
  error.value = ''; message.value = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { error.value = '请输入有效邮箱'; return; }
  sending.value = true;
  try { const result = await api('/auth/code', { method: 'POST', body: { email: email.value.trim() } }); message.value = result.message; count(result.retryAfter); }
  catch (failure) { error.value = failure.message; if (failure.retryAfter) count(failure.retryAfter); }
  finally { sending.value = false; }
}
async function login() {
  if (loggingIn.value) return;
  error.value = ''; loggingIn.value = true;
  try {
    const result = await api('/auth/login', { method: 'POST', body: { email: email.value.trim(), code: code.value.trim() } });
    code.value = ''; emit('logged-in', result.user);
  } catch (failure) { error.value = failure.message; }
  finally { loggingIn.value = false; }
}
onUnmounted(() => clearInterval(timer));
</script>
<template>
  <el-dialog v-model="model" title="邮箱登录" width="420px" class="paper-dialog" :close-on-click-modal="false">
    <p class="dialog-intro">第一次验证邮箱后，将自动为你创建账号。</p>
    <el-form label-position="top" @submit.prevent="login">
      <el-form-item label="邮箱地址"><el-input v-model="email" type="email" maxlength="254" autocomplete="email" placeholder="输入你的邮箱" :disabled="sending || loggingIn" /></el-form-item>
      <el-form-item label="邮箱验证码"><div class="code-row"><el-input v-model="code" maxlength="6" inputmode="numeric" autocomplete="one-time-code" placeholder="6 位验证码" /><el-button @click="send" :loading="sending" :disabled="countdown > 0 || loggingIn">{{ countdown ? `${countdown} 秒后重发` : '发送验证码' }}</el-button></div></el-form-item>
      <el-alert v-if="message" :title="message" type="success" :closable="false" role="status" />
      <el-alert v-if="error" :title="error" type="error" :closable="false" role="alert" />
      <el-button class="full-width form-submit" type="primary" native-type="submit" :loading="loggingIn">验证并登录</el-button>
    </el-form>
  </el-dialog>
</template>
