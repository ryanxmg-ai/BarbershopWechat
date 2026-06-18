<script setup>
import { ref, onMounted } from 'vue';
import * as echarts from 'echarts';
import request from '../api/request';

const stats = ref({ storeCount: 0, barberCount: 0, todayCount: 0, weekCount: 0, monthRevenue: 0, trend: [], recent: [] });
const chartRef = ref(null);

const statusText = { confirmed: '已确认', completed: '已完成', cancelled: '已取消', pending: '待确认' };

onMounted(async () => {
  stats.value = await request.get('/admin/dashboard');
  const chart = echarts.init(chartRef.value);
  chart.setOption({
    grid: { left: 30, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: stats.value.trend.map((t) => t.date) },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, data: stats.value.trend.map((t) => t.count),
      areaStyle: { color: 'rgba(31,48,38,.12)' }, lineStyle: { color: '#1f3026' }, itemStyle: { color: '#c9a96a' } }],
  });
});
</script>

<template>
  <div>
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
.recent-item { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #555; }
</style>
