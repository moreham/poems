<script setup>
import { ref, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, statusLabels, statusTypes, displayDate } from '../api.js';
import SubmissionDetails from './SubmissionDetails.vue';
const admin = ref(null), checking = ref(true), loginBusy = ref(false), loginError = ref('');
const adminKey = ref('');
const items = ref([]), total = ref(0), page = ref(1), status = ref('pending'), counts = ref({}), busy = ref(false), error = ref('');
const selected = ref(null), rejectOpen = ref(false), reason = ref(''), reviewBusy = ref(false);
let revision = 0;
async function login() {
  if (loginBusy.value) return;
  loginBusy.value = true; loginError.value = '';
  try { admin.value = (await api('/admin/login', { method: 'POST', body: { key: adminKey.value } })).admin; adminKey.value = ''; load(); }
  catch (failure) { loginError.value = failure.message; }
  finally { loginBusy.value = false; }
}
async function logout() {
  try { await api('/admin/logout', { method: 'POST' }); revision++; admin.value = null; items.value = []; selected.value = null; rejectOpen.value = false; busy.value = false; }
  catch (failure) { ElMessage.error(failure.message); }
}
async function load() {
  if (!admin.value) return;
  const version = ++revision; busy.value = true; error.value = '';
  try {
    const result = await api(`/admin/submissions?page=${page.value}&status=${status.value}`);
    if (version === revision) { items.value = result.items; total.value = result.total; counts.value = result.counts; }
  } catch (failure) { if (version === revision) { error.value = failure.message; if (failure.status === 401) admin.value = null; } }
  finally { if (version === revision) busy.value = false; }
}
function filter(value) { status.value = value; page.value = 1; }
watch([page, status], load);
async function review(decision) {
  if (!selected.value || reviewBusy.value) return;
  if (decision === 'approved') {
    try { await ElMessageBox.confirm('通过后，这句诗会加入公开抽签池。确认通过？', '审核通过', { confirmButtonText: '确认通过', cancelButtonText: '取消', type: 'warning' }); }
    catch { return; }
  }
  reviewBusy.value = true;
  try {
    await api(`/admin/submissions/${selected.value.id}/review`, { method: 'POST', body: { status: decision, reason: reason.value } });
    ElMessage.success(decision === 'approved' ? '已通过，诗句已加入抽签池' : '已驳回投稿');
    rejectOpen.value = false; selected.value = null; reason.value = ''; await load();
  } catch (failure) {
    ElMessage.error(failure.message);
    if (failure.status === 401) { admin.value = null; rejectOpen.value = false; selected.value = null; }
    if (failure.status === 409) { rejectOpen.value = false; selected.value = null; await load(); }
  } finally { reviewBusy.value = false; }
}
onMounted(async () => {
  try { admin.value = (await api('/admin/me')).admin; if (admin.value) await load(); }
  catch (failure) { loginError.value = failure.message; }
  finally { checking.value = false; }
});
</script>
<template>
  <header class="site-header"><a class="site-brand" href="/">一笺诗意<span>投稿审核后台</span></a><nav><a href="/">返回抽签</a><template v-if="admin"><span>{{ admin.username }}</span><el-button text @click="logout">退出管理</el-button></template></nav></header>
  <main class="content-page admin-page">
    <div v-if="checking" class="empty-panel">正在确认管理员身份…</div>
    <section v-else-if="!admin" class="admin-login data-panel">
      <p class="eyebrow">独立管理入口</p><h1>管理员验证</h1><p class="muted">输入管理员密钥进入审核后台。</p>
      <el-form label-position="top" @submit.prevent="login"><el-form-item label="管理员密钥"><el-input v-model="adminKey" type="password" maxlength="128" autocomplete="current-password" placeholder="请输入管理员密钥" show-password /></el-form-item><el-alert v-if="loginError" :title="loginError" type="error" :closable="false" /><el-button class="full-width form-submit" type="primary" native-type="submit" :loading="loginBusy">进入后台</el-button></el-form>
    </section>
    <template v-else>
      <div class="page-heading"><div><p class="eyebrow">让好诗被看见</p><h1>投稿审核</h1><p class="muted">核对诗句、出处与诗意，再将它送入签筒。</p></div><el-button @click="load" :loading="busy">刷新列表</el-button></div>
      <div class="review-stats"><button v-for="(label, key) in statusLabels" :key="key" @click="filter(key)" :class="{ active: status === key }"><span>{{ label }}</span><strong>{{ counts[key] || 0 }}</strong></button></div>
      <section class="data-panel"><div class="panel-toolbar"><el-select :model-value="status" @update:model-value="filter" aria-label="审核状态" style="width: 160px"><el-option label="全部记录" value="all" /><el-option v-for="(label, key) in statusLabels" :key="key" :label="label" :value="key" /></el-select><span class="muted">共 {{ total }} 条</span></div><el-alert v-if="error" :title="error" type="error" :closable="false" />
        <el-table :data="items" v-loading="busy" empty-text="当前没有投稿记录" row-key="id"><el-table-column prop="verse" label="投稿诗句" min-width="220" show-overflow-tooltip /><el-table-column prop="email" label="投稿邮箱" min-width="200" show-overflow-tooltip /><el-table-column label="状态" width="95"><template #default="{ row }"><el-tag :type="statusTypes[row.status]">{{ statusLabels[row.status] }}</el-tag></template></el-table-column><el-table-column label="投稿时间" width="190"><template #default="{ row }">{{ displayDate(row.created_at) }}</template></el-table-column><el-table-column label="操作" fixed="right" width="100"><template #default="{ row }"><el-button type="primary" link @click="selected = row; reason = ''">{{ row.status === 'pending' ? '查看并审核' : '查看历史' }}</el-button></template></el-table-column></el-table>
        <el-pagination v-model:current-page="page" :page-size="10" :total="total" :pager-count="5" layout="prev, pager, next" hide-on-single-page />
      </section>
    </template>
    <el-dialog :model-value="!!selected" @update:model-value="selected = null" title="投稿详情与审核" width="660px" class="paper-dialog" :close-on-click-modal="false" :show-close="!reviewBusy" :close-on-press-escape="!reviewBusy"><SubmissionDetails v-if="selected" :item="selected" /><template #footer><div v-if="selected?.status === 'pending'" class="form-actions"><el-button type="danger" plain :disabled="reviewBusy" @click="rejectOpen = true">驳回</el-button><el-button type="primary" :loading="reviewBusy" @click="review('approved')">通过审核</el-button></div></template></el-dialog>
    <el-dialog v-model="rejectOpen" title="驳回投稿" width="460px" class="paper-dialog" :close-on-click-modal="false" :show-close="!reviewBusy" :close-on-press-escape="!reviewBusy" append-to-body><el-form label-position="top"><el-form-item label="驳回理由（选填，投稿人可见）"><el-input v-model="reason" type="textarea" :rows="4" maxlength="1000" show-word-limit placeholder="如：诗句出处有误，请核对后重新投稿" /></el-form-item></el-form><template #footer><el-button :disabled="reviewBusy" @click="rejectOpen = false">取消</el-button><el-button type="danger" :loading="reviewBusy" @click="review('rejected')">确认驳回</el-button></template></el-dialog>
  </main>
</template>
