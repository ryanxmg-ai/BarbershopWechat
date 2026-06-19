<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../api/request';

const list = ref([]);
const keyword = ref('');
const dialogVisible = ref(false);
const editing = ref(null);
const form = ref({});
const bizStart = ref('10:00');
const bizEnd = ref('22:00');
const API_BASE = import.meta.env.VITE_API_BASE;

async function load() {
  const params = keyword.value ? `?keyword=${encodeURIComponent(keyword.value)}` : '';
  list.value = await request.get(`/stores${params}`);
}
onMounted(load);

function openCreate() {
  editing.value = null;
  form.value = { name: '', address: '', business_hours: '10:00-22:00', phone: '', images: [], status: 'open' };
  bizStart.value = '10:00';
  bizEnd.value = '22:00';
  dialogVisible.value = true;
}
function openEdit(row) {
  editing.value = row.id;
  form.value = { ...row, images: row.images || [] };
  const [s, e] = (row.business_hours || '10:00-22:00').split('-');
  bizStart.value = (s || '10:00').trim();
  bizEnd.value = (e || '22:00').trim();
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.name) { ElMessage.warning('请填写门店名称'); return; }
  form.value.business_hours = `${bizStart.value}-${bizEnd.value}`;
  if (editing.value) await request.put(`/stores/${editing.value}`, form.value);
  else await request.post('/stores', form.value);
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除门店「${row.name}」吗？该门店下的所有理发师也会一并删除，且不可恢复。`,
      '删除门店',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '再想想' }
    );
  } catch {
    return; // 用户取消
  }
  await request.delete(`/stores/${row.id}`);
  ElMessage.success('已删除');
  load();
}

// 门店图片上传成功回调
function onImageUploaded(res) {
  form.value.images = [...(form.value.images || []), res.url];
}
function removeImage(url) {
  form.value.images = form.value.images.filter((u) => u !== url);
}
</script>

<template>
  <div>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索门店名称" style="width:240px" @keyup.enter="load" clearable @clear="load" />
      <el-button type="primary" @click="openCreate">+ 新增门店</el-button>
    </div>

    <el-table :data="list" stripe>
      <el-table-column prop="name" label="门店名称" width="120" />
      <el-table-column prop="address" label="地址" />
      <el-table-column prop="business_hours" label="营业时间" width="140" />
      <el-table-column prop="phone" label="联系电话" width="150" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'open' ? 'success' : 'info'">{{ row.status === 'open' ? '营业中' : '休息中' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑门店' : '新增门店'" width="560px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="门店名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="门店地址"><el-input v-model="form.address" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="营业时间">
          <el-time-select v-model="bizStart" start="08:00" end="23:30" step="00:30" placeholder="开始" style="width:130px" />
          <span style="margin:0 8px;color:#8a958e">至</span>
          <el-time-select v-model="bizEnd" start="08:00" end="23:30" step="00:30" placeholder="结束" style="width:130px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="open">营业中</el-radio>
            <el-radio value="closed">休息中</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="门店图片">
          <div class="img-list">
            <div v-for="url in form.images" :key="url" class="img-item">
              <img :src="url" /><el-icon class="del" @click="removeImage(url)"><Close /></el-icon>
            </div>
            <el-upload
              :action="`${API_BASE}/upload?bucket=store-images`"
              :headers="{ Authorization: `Bearer ${localStorage.getItem('admin_token')}` }"
              name="file" :show-file-list="false" :on-success="onImageUploaded" accept="image/*">
              <div class="upload-box">+ 上传图片</div>
            </el-upload>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; margin-bottom: 14px; }
.img-list { display: flex; gap: 10px; flex-wrap: wrap; }
.img-item { position: relative; width: 80px; height: 60px; }
.img-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
.img-item .del { position: absolute; top: -6px; right: -6px; background: #fff; border-radius: 50%; cursor: pointer; }
.upload-box { width: 80px; height: 60px; border: 1px dashed #c9a96a; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #c9a96a; font-size: 12px; cursor: pointer; }
</style>
