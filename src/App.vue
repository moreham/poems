<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from './api.js';
import PoemStage from './components/PoemStage.vue';
import LoginDialog from './components/LoginDialog.vue';
import SubmissionDialog from './components/SubmissionDialog.vue';
import RecordsPage from './components/RecordsPage.vue';
import AdminPage from './components/AdminPage.vue';
const adminPage = location.pathname === '/admin';
const recordsPage = location.pathname === '/submissions';
const user = ref(null);
const checking = ref(true);
const loginOpen = ref(false);
const submissionOpen = ref(false);
const logoutBusy = ref(false);
const authError = ref('');
const recordsRefresh = ref(0);
const moreOpen = ref(false);
const moreButton = ref(null);
function closeMore() { moreOpen.value = false; moreButton.value?.focus(); }
function chooseAction(action) { closeMore(); action(); }
function submitted() { recordsRefresh.value++; ElMessage.success('投稿已送达，审核通过后会加入抽签池'); }
let afterLogin = '';
function login(action = '') { afterLogin = action; loginOpen.value = true; }
function submit() { if (user.value) submissionOpen.value = true; else login('submit'); }
function records() { if (user.value) location.assign('/submissions'); else login('records'); }
function loggedIn(account) {
  user.value = account; authError.value = ''; loginOpen.value = false;
  if (afterLogin === 'submit') submissionOpen.value = true;
  if (afterLogin === 'records' && !recordsPage) location.assign('/submissions');
  afterLogin = '';
}
async function logout() {
  logoutBusy.value = true;
  try { await api('/auth/logout', { method: 'POST' }); user.value = null; submissionOpen.value = false; }
  catch (error) { ElMessage.error(error.message); }
  finally { logoutBusy.value = false; }
}
function expired() { user.value = null; submissionOpen.value = false; login('submit'); }
const shortcutKeys = new Set();
function clearShortcut() { shortcutKeys.clear(); }
function adminShortcut(event) {
  const editing = event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
  if (event.isComposing || editing || event.ctrlKey || event.altKey || event.metaKey) { clearShortcut(); return; }
  if (event.repeat) return;
  shortcutKeys.add(event.code);
  if (event.shiftKey && shortcutKeys.has('KeyE') && shortcutKeys.has('KeyF')) {
    event.preventDefault();
    clearShortcut();
    location.assign('/admin');
  }
}
function releaseShortcut(event) { shortcutKeys.delete(event.code); }
onMounted(() => {
  if (adminPage) return;
  window.addEventListener('keydown', adminShortcut);
  window.addEventListener('keyup', releaseShortcut);
  window.addEventListener('blur', clearShortcut);
  document.addEventListener('visibilitychange', clearShortcut);
});
onUnmounted(() => {
  window.removeEventListener('keydown', adminShortcut);
  window.removeEventListener('keyup', releaseShortcut);
  window.removeEventListener('blur', clearShortcut);
  document.removeEventListener('visibilitychange', clearShortcut);
});
onMounted(async () => {
  if (adminPage) { checking.value = false; return; }
  try { user.value = (await api('/auth/me')).user; }
  catch (error) { authError.value = error.message; }
  finally { checking.value = false; }
});
</script>
<template>
  <AdminPage v-if="adminPage" />
  <template v-else>
    <header class="public-header" @keydown.esc.stop.prevent="closeMore">
      <button ref="moreButton" class="more-button" type="button" :aria-expanded="moreOpen" aria-controls="more-menu" @click="moreOpen = !moreOpen">
        更多
        <svg aria-hidden="true" viewBox="0 0 16 16" :class="{ 'is-open': moreOpen }"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      <nav v-show="moreOpen" id="more-menu" class="more-menu" aria-label="用户导航">
        <el-button text @click="chooseAction(submit)" :disabled="checking">投稿诗句</el-button>
        <el-button text @click="chooseAction(records)" :disabled="checking">我的投稿</el-button>
        <el-button v-if="user" text :loading="logoutBusy" @click="chooseAction(logout)">退出登录</el-button>
        <el-button v-else type="primary" plain :disabled="checking" @click="chooseAction(login)">邮箱登录</el-button>
      </nav>
    </header>
    <el-alert v-if="authError" :title="authError" type="warning" :closable="false" class="page-alert" />
    <RecordsPage v-if="recordsPage" :user="user" :checking="checking" :refresh="recordsRefresh" @login="login('records')" @submit="submit" @expired="user = null" />
    <PoemStage v-else />
    <footer class="site-footer"><span>一诗一会 · 随心而遇</span></footer>
    <LoginDialog v-model="loginOpen" @logged-in="loggedIn" />
    <SubmissionDialog v-if="user" v-model="submissionOpen" @expired="expired" @submitted="submitted" />
  </template>
</template>
