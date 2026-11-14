<script setup>
import { statusLabels, statusTypes, displayDate } from '../api.js';
defineProps({ item: { type: Object, required: true } });
</script>
<template>
  <div class="submission-detail">
    <el-tag :type="statusTypes[item.status]">{{ statusLabels[item.status] }}</el-tag>
    <blockquote>{{ item.verse }}</blockquote>
    <p class="muted">{{ item.author }} · 《{{ item.title }}》</p>
    <h3>诗意解读</h3><p class="preserve-lines">{{ item.meaning }}</p>
    <h3>原文</h3><p class="preserve-lines">{{ item.original }}</p>
    <a v-if="item.source_url" :href="item.source_url" target="_blank" rel="noopener noreferrer">查阅投稿来源 ↗</a>
    <el-alert v-if="item.status === 'rejected'" :title="item.rejection_reason || '本次投稿未通过审核，管理员未填写理由。'" type="error" :closable="false" />
    <dl class="detail-meta"><dt>投稿时间</dt><dd>{{ displayDate(item.created_at) }}</dd><template v-if="item.email"><dt>投稿人</dt><dd>{{ item.email }}</dd></template><template v-if="item.reviewed_at"><dt>审核时间</dt><dd>{{ displayDate(item.reviewed_at) }}</dd></template><template v-if="item.reviewer"><dt>审核人</dt><dd>{{ item.reviewer }}</dd></template></dl>
  </div>
</template>
