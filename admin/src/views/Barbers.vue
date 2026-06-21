<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../api/request';

const all = ref([]);
const stores = ref([]);
const filterStore = ref('');
const filterStatus = ref('');
const keyword = ref('');
const dialogVisible = ref(false);
const editing = ref(null);
const form = ref({});
const API_BASE = import.meta.env.VITE_API_BASE;
const SPECIALTIES = ['男士剪发', '造型设计', '油头', '渐变', '纹理烫', '染发', '胡须修剪', '经典背头'];
// 上传组件鉴权头：在 script 里读 localStorage（模板不能直接访问全局对象）
const uploadHeaders = computed(() => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` }));

async function load() {
  all.value = await request.get('/barbers');
  stores.value = await request.get('/stores');
}
onMounted(load);

const filtered = computed(() =>
  all.value.filter((b) =>
    (!filterStore.value || b.store_id === filterStore.value) &&
    (!filterStatus.value || b.status === filterStatus.value) &&
    (!keyword.value || b.name.includes(keyword.value))
  )
);
const storeName = (id) => stores.value.find((s) => s.id === id)?.name || '';

function openCreate() {
  editing.value = null;
  form.value = { name: '', title: '发型师', store_id: stores.value[0]?.id, specialties: [], status: 'active', avatar_url: '', bio: '', years_experience: 1 };
  dialogVisible.value = true;
}
function openEdit(b) {
  editing.value = b.id;
  form.value = { ...b, specialties: b.specialties || [] };
  dialogVisible.value = true;
}
async function save() {
  if (editing.value) await request.put(`/barbers/${editing.value}`, form.value);
  else await request.post('/barbers', form.value);
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}
async function toggleStatus(b) {
  const disabling = b.status === 'active';
  // 停用会影响该理发师排班，先确认；启用无害，直接执行
  if (disabling) {
    try {
      await ElMessageBox.confirm(
        `确认停用理发师「${b.name}」吗？停用后顾客将无法预约 TA。`,
        '停用理发师',
        { type: 'warning', confirmButtonText: '确认停用', cancelButtonText: '再想想' }
      );
    } catch {
      return; // 用户取消
    }
  }
  await request.put(`/barbers/${b.id}`, { status: disabling ? 'resting' : 'active' });
  ElMessage.success(disabling ? '已停用' : '已启用');
  load();
}
function onAvatarUploaded(res) { form.value.avatar_url = res.url; }
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="filters">
        <el-input v-model="keyword" placeholder="搜索理发师姓名" style="width:180px" clearable />
        <el-select v-model="filterStore" placeholder="全部门店" clearable style="width:140px">
          <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width:120px">
          <el-option label="在职" value="active" />
          <el-option label="休息" value="resting" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新增理发师</el-button>
    </div>

    <el-row :gutter="16">
      <el-col :span="8" v-for="b in filtered" :key="b.id" style="margin-bottom:16px">
        <div class="barber-card">
          <el-avatar :size="56" :src="b.avatar_url" shape="square">{{ b.name[0] }}</el-avatar>
          <div class="info">
            <div class="name">{{ b.name }} <el-tag size="small">{{ b.title }}</el-tag></div>
            <div class="store">{{ storeName(b.store_id) }}</div>
            <div class="spec">擅长：{{ (b.specialties || []).join('、') }}</div>
            <el-tag size="small" :type="b.status === 'active' ? 'success' : 'info'">{{ b.status === 'active' ? '在职' : '休息' }}</el-tag>
          </div>
          <div class="actions">
            <el-button link type="primary" @click="openEdit(b)">编辑</el-button>
            <el-button link @click="toggleStatus(b)">{{ b.status === 'active' ? '停用' : '启用' }}</el-button>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑理发师' : '新增理发师'" width="560px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="头像">
          <el-upload
            :action="`${API_BASE}/upload?bucket=avatars`"
            :headers="uploadHeaders"
            name="file" :show-file-list="false" :on-success="onAvatarUploaded" accept="image/*">
            <el-avatar :size="80" :src="form.avatar_url" shape="square">+</el-avatar>
          </el-upload>
          <span class="tip">支持 JPG/PNG，建议 800×800</span>
        </el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="所属门店">
          <el-select v-model="form.store_id" style="width:100%">
            <el-option v-for="s in stores" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="职级">
          <el-select v-model="form.title" style="width:100%">
            <el-option label="店长 · 高级发型师" value="店长 · 高级发型师" />
            <el-option label="高级发型师" value="高级发型师" />
            <el-option label="发型师" value="发型师" />
          </el-select>
        </el-form-item>
        <el-form-item label="擅长项目">
          <el-select v-model="form.specialties" multiple style="width:100%">
            <el-option v-for="s in SPECIALTIES" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="从业年限"><el-input-number v-model="form.years_experience" :min="0" /></el-form-item>
        <el-form-item label="排班状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active">在职</el-radio>
            <el-radio value="resting">休息</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="简介"><el-input v-model="form.bio" type="textarea" :rows="2" maxlength="200" show-word-limit /></el-form-item>
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
.filters { display: flex; gap: 10px; }
.barber-card { background: #fff; border-radius: 10px; padding: 16px; display: flex; gap: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.barber-card .info { flex: 1; }
.barber-card .name { font-weight: 600; color: #1f3026; }
.barber-card .store { color: #8a958e; font-size: 12px; margin: 4px 0; }
.barber-card .spec { color: #666; font-size: 12px; margin-bottom: 6px; }
.tip { color: #aaa; font-size: 12px; margin-left: 10px; }
</style>
