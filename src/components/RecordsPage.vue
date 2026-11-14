<script setup>
import { ref, watch } from 'vue';
import { api, statusLabels, statusTypes, displayDate } from '../api.js';
import SubmissionDetails from './SubmissionDetails.vue';
const props = defineProps(['user', 'checking', 'refresh']);
const emit = defineEmits(['login', 'submit', 'expired']);
const items = ref([]), total = ref(0), page = ref(1), status = ref('all'), busy = ref(false), error = ref(''), selected = ref(null);
let revision = 0;
async function load() {
  const version = ++revision;
  if (!props.user) { items.value = []; total.value = 0; busy.value = false; return; }
  busy.value = true; error.value = '';
  try {
    const result = await api(`/submissions?page=${page.value}&status=${status.value}`);
    if (version === revision) { items.value = result.items; total.value = result.total; }
  } catch (failure) { if (version === revision) { error.value = failure.message; if (failure.status === 401) emit('expired'); } }
  finally { if (version === revision) busy.value = false; }
}
watch(() => props.user?.id, () => { selected.value = null; page.value = 1; load(); }, { immediate: true });
watch([page, status, () => props.refresh], load);
function filter(value) { status.value = value; page.value = 1; }
</script>
<template>
  <main class="content-page">
    <div class="page-heading"><div><p class="eyebrow">我的诗笺</p><h1>投稿记录</h1><p class="muted">每一次分享，都有迹可循。</p></div><el-button v-if="user" type="primary" @click="emit('submit')">再投一句</el-button></div>
    <div v-if="checking" class="empty-panel">正在确认登录状态…</div>
    <div v-else-if="!user" class="empty-panel"><h2>登录后查看你的投稿</h2><p>待审核、通过、驳回，所有记录都保存在这里。</p><el-button type="primary" @click="emit('login')">邮箱登录</el-button></div>
    <section v-else class="data-panel">
      <div class="panel-toolbar"><el-select :model-value="status" @update:model-value="filter" aria-label="投稿状态" style="width: 150px"><el-option label="全部状态" value="all" /><el-option v-for="(label, key) in statusLabels" :key="key" :label="label" :value="key" /></el-select><el-button @click="load" :loading="busy">刷新记录</el-button></div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
      <el-table :data="items" v-loading="busy" empty-text="还没有投稿，分享你喜欢的第一句诗吧" row-key="id">
        <el-table-column prop="verse" label="诗句" min-width="220" show-overflow-tooltip /><el-table-column label="状态" width="95"><template #default="{ row }"><el-tag :type="statusTypes[row.status]">{{ statusLabels[row.status] }}</el-tag></template></el-table-column>
        <el-table-column label="投稿时间" width="190"><template #default="{ row }">{{ displayDate(row.created_at) }}</template></el-table-column><el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="selected = row">查看详情</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :page-size="10" :total="total" layout="prev, pager, next" :pager-count="5" hide-on-single-page />
    </section>
    <el-dialog :model-value="!!selected" @update:model-value="selected = null" title="投稿详情" width="620px" class="paper-dialog"><SubmissionDetails v-if="selected" :item="selected" /></el-dialog>
  </main>
</template>
