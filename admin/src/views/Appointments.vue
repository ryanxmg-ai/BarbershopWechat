<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../api/request';

const items = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const stores = ref([]);
const barbers = ref([]);
const filters = ref({ store_id: '', barber_id: '', date: '', status: '' });

const statusMeta = {
  pending: { text: '待确认', type: 'warning' },
  confirmed: { text: '已确认', type: 'success' },
  completed: { text: '已完成', type: 'info' },
  cancelled: { text: '已取消', type: 'danger' },
};

// UTC 时间戳 -> 本地「YYYY-MM-DD HH:mm:ss」
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).replace(/\.(\d{3})\d*/, '.$1'));
  if (isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function load() {
  const q = new URLSearchParams({ page: page.value, pageSize: pageSize.value });
  Object.entries(filters.value).forEach(([k, v]) => { if (v) q.append(k, v); });
  const res = await request.get(`/appointments/admin?${q.toString()}`);
  items.value = res.items;
  total.value = res.total;
}
onMounted(async () => {
  stores.value = await request.get('/stores');
  barbers.value = await request.get('/barbers');
  load();
});

function search() { page.value = 1; load(); }
function reset() { filters.value = { store_id: '', barber_id: '', date: '', status: '' }; search(); }

async function changeStatus(row, status) {
  await request.put(`/appointments/admin/${row.id}`, { status });
  ElMessage.success('状态已更新');
  load();
}

// 取消预约：先弹确认框，管理员确认后再取消
async function cancelAppointment(row) {
  try {
    await ElMessageBox.confirm(
      `确认取消订单「${row.order_no}」吗？\n顾客 ${row.user_phone} · ${row.appointment_date} ${row.appointment_time}`,
      '取消预约',
      { type: 'warning', confirmButtonText: '确认取消', cancelButtonText: '再想想' }
    );
  } catch {
    return; // 用户点了“再想想”或关闭对话框
  }
  await changeStatus(row, 'cancelled');
}
</script>

<template>
  <div>
    <div class="total-bar">共 <b>{{ total }}</b> 条预约记录</div>
    <div class="filters">
      <el-select v-model="filters.store_id" placeholder="全部门店" clearable style="width:130px">
        <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <el-date-picker v-model="filters.date" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:150px" />
      <el-select v-model="filters.barber_id" placeholder="全部理发师" clearable style="width:140px">
        <el-option v-for="b in barbers" :key="b.id" :label="b.name" :value="b.id" />
      </el-select>
      <el-select v-model="filters.status" placeholder="全部状态" clearable style="width:120px">
        <el-option v-for="(m, k) in statusMeta" :key="k" :label="m.text" :value="k" />
      </el-select>
      <el-button type="primary" @click="search">搜索</el-button>
      <el-button @click="reset">重置</el-button>
    </div>

    <el-table :data="items" stripe>
      <el-table-column label="预约时间" width="160">
        <template #default="{ row }">{{ row.appointment_date }} {{ row.appointment_time }}</template>
      </el-table-column>
      <el-table-column prop="order_no" label="订单号" width="150" />
      <el-table-column prop="user_phone" label="顾客" width="130" />
      <el-table-column label="门店" width="100"><template #default="{ row }">{{ row.store?.name }}</template></el-table-column>
      <el-table-column label="理发师" width="100"><template #default="{ row }">{{ row.barber?.name }}</template></el-table-column>
      <el-table-column label="服务项目"><template #default="{ row }">{{ row.service?.name }}</template></el-table-column>
      <el-table-column label="消费金额" width="100">
        <template #default="{ row }"><span class="amount">¥{{ row.amount }}</span></template>
      </el-table-column>
      <el-table-column label="下单时间" width="170">
        <template #default="{ row }"><span class="muted-time">{{ fmtTime(row.created_at) }}</span></template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusMeta[row.status]?.type">{{ statusMeta[row.status]?.text }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="primary" @click="changeStatus(row, 'confirmed')">确认</el-button>
          <el-button v-if="row.status === 'confirmed'" link type="primary" @click="changeStatus(row, 'completed')">完成</el-button>
          <el-button v-if="['pending','confirmed'].includes(row.status)" link type="danger" @click="cancelAppointment(row)">取消</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      style="margin-top:14px; justify-content:flex-end"
      layout="total, prev, pager, next" :total="total"
      :page-size="pageSize" :current-page="page"
      @current-change="(p) => { page = p; load(); }" />
  </div>
</template>

<style scoped>
.total-bar { margin-bottom: 12px; color: #555; font-size: 14px; }
.total-bar b { color: #1f3026; font-size: 18px; margin: 0 2px; }
.filters { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.amount { color: #c9a96a; font-weight: 600; }
.muted-time { color: #8a958e; font-size: 13px; }
</style>
