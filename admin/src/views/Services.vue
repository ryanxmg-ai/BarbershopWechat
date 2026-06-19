<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../api/request';

const list = ref([]);
const dialogVisible = ref(false);
const editing = ref(null);
const form = ref({});

const CATEGORIES = ['剪发造型', '潮流造型', '烫染', '护理', '基础服务'];

async function load() {
  list.value = await request.get('/services');
}
onMounted(load);

function openCreate() {
  editing.value = null;
  form.value = { name: '', category: '剪发造型', description: '', price: 0, duration: 30, status: 'active', sort_order: list.value.length + 1 };
  dialogVisible.value = true;
}
function openEdit(row) {
  editing.value = row.id;
  form.value = { ...row };
  dialogVisible.value = true;
}

async function save() {
  if (!form.value.name) { ElMessage.warning('请填写服务名称'); return; }
  if (editing.value) await request.put(`/services/${editing.value}`, form.value);
  else await request.post('/services', form.value);
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

// 快速上架/下架切换
async function toggleStatus(row) {
  const next = row.status === 'active' ? 'inactive' : 'active';
  await request.put(`/services/${row.id}`, { status: next });
  ElMessage.success(next === 'active' ? '已上架' : '已下架');
  load();
}
</script>

<template>
  <div>
    <div class="toolbar">
      <span class="total">共 <b>{{ list.length }}</b> 个服务项目</span>
      <el-button type="primary" @click="openCreate">+ 新增服务</el-button>
    </div>

    <el-table :data="list" stripe>
      <el-table-column prop="name" label="服务名称" width="180" />
      <el-table-column label="分类" width="120">
        <template #default="{ row }"><el-tag effect="plain">{{ row.category }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="description" label="说明" show-overflow-tooltip />
      <el-table-column label="价格" width="100">
        <template #default="{ row }"><span class="price">¥{{ row.price }}</span></template>
      </el-table-column>
      <el-table-column label="时长" width="90">
        <template #default="{ row }">{{ row.duration }} 分钟</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '上架' : '下架' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.status === 'active' ? 'warning' : 'success'" @click="toggleStatus(row)">
            {{ row.status === 'active' ? '下架' : '上架' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑服务项目' : '新增服务项目'" width="540px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="服务名称"><el-input v-model="form.name" placeholder="如 男士剪发(洗剪吹)" /></el-form-item>
        <el-form-item label="分类">
          <el-select v-model="form.category" filterable allow-create style="width:100%">
            <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="价格">
          <el-input-number v-model="form.price" :min="0" :step="10" /> <span class="unit">元</span>
        </el-form-item>
        <el-form-item label="时长">
          <el-input-number v-model="form.duration" :min="5" :step="5" /> <span class="unit">分钟</span>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="active">上架</el-radio>
            <el-radio value="inactive">下架</el-radio>
          </el-radio-group>
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
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.total { color: #555; font-size: 14px; }
.total b { color: #1f3026; font-size: 18px; margin: 0 2px; }
.price { color: #c9a96a; font-weight: 600; }
.unit { margin-left: 8px; color: #8a958e; }
</style>
