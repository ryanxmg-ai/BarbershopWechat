<script setup>
import { ref, onMounted } from 'vue';
import * as echarts from 'echarts';
import request from '../api/request';

const stats = ref({ storeCount: 0, barberCount: 0, todayCount: 0, weekCount: 0, monthRevenue: 0, trend: [], recent: [] });
const chartRef = ref(null);
const updatedAt = ref('');
const loading = ref(false);
let chart = null;

const statusText = { confirmed: '已确认', completed: '已完成', cancelled: '已取消', pending: '待确认' };

const pad = (n) => String(n).padStart(2, '0');
function nowLabel() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 每次进入页面/刷新/点刷新都重新拉取，带时间戳避免任何缓存
async function loadData() {
  loading.value = true;
  try {
    stats.value = await request.get('/admin/dashboard', { params: { _t: Date.now() } });
    updatedAt.value = nowLabel();
    if (!chart) chart = echarts.init(chartRef.value);
    chart.setOption({
      grid: { left: 30, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: stats.value.trend.map((t) => t.date) },
      yAxis: { type: 'value' },
      series: [{
        type: 'line', smooth: true, data: stats.value.trend.map((t) => t.count),
        areaStyle: { color: 'rgba(31,48,38,.12)' }, lineStyle: { color: '#1f3026' }, itemStyle: { color: '#c9a96a' },
      }],
    });
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div>
    <div class="dash-head">
      <span class="updated" v-if="updatedAt">数据更新于 {{ updatedAt }}</span>
      <el-button size="small" :loading="loading" @click="loadData">刷新数据</el-button>
    </div>

    <el-row :gutter="16">
      <el-col :span="5"><div class="stat-card"><div class="label">门店数</div><div class="num">{{ stats.storeCount }}</div></div></el-col>
      <el-col :span="5"><div class="stat-card"><div class="label">理发师</div><div class="num">{{ stats.barberCount }}</div></div></el-col>
      <el-col :span="4"><div class="stat-card"><div class="label">今日预约</div><div class="num">{{ stats.todayCount }}</div></div></el-col>
      <el-col :span="5"><div class="stat-card"><div class="label">本周预约</div><div class="num">{{ stats.weekCount }}</div></div></el-col>
      <el-col :span="5"><div class="stat-card"><div class="label">本月营业额</div><div class="num">¥{{ stats.monthRevenue.toLocaleString() }}</div></div></el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="15">
        <el-card header="预约趋势（近7天）"><div ref="chartRef" style="height:300px"></div></el-card>
      </el-col>
      <el-col :span="9">
        <el-card header="近期动态">
          <div v-for="r in stats.recent" :key="r.order_no" class="recent-item">
            <el-tag size="small" effect="plain">{{ statusText[r.status] }}</el-tag>
            <span>{{ r.user_phone }} · {{ r.store?.name }} · {{ r.barber?.name }}</span>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dash-head { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-bottom: 14px; }
.updated { color: #8a958e; font-size: 13px; }
.recent-item { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #555; }
</style>
