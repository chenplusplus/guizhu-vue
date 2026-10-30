<template>
  <div v-if="urls && urls.length" class="image-group">
    <el-image
      v-for="(url, i) in urls"
      :key="i"
      :src="url"
      fit="cover"
      class="group-img"
      :preview-src-list="urls"
      :initial-index="i"
      preview-teleported
    />
  </div>
  <el-empty v-else :description="emptyText" :image-size="60" />
</template>

<script setup>
defineProps({
  urls: { type: Array, default: () => [] },
  emptyText: { type: String, default: '暂无图片' },
});
</script>

<style scoped>
.image-group { display: flex; flex-wrap: wrap; gap: 10px; }
.group-img {
  width: 120px;
  height: 120px;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}
</style>
