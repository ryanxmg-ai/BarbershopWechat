<script setup>
import { useRoute } from 'vue-router';
import { computed } from 'vue';
const route = useRoute();
const title = computed(() => route.name || '功能');
</script>

<template>
  <el-empty :description="`${title}功能开发中`" />
</template>
