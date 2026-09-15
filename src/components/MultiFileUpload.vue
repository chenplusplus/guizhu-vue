<template>
  <div class="multi-file-upload">
    <el-upload
      :action="''"
      :http-request="handleUpload"
      :show-file-list="false"
      :accept="accept"
      :multiple="true"
      :disabled="uploading || fileList.length >= maxCount"
    >
      <el-button type="primary" :loading="uploading" :disabled="fileList.length >= maxCount">
        <el-icon><Upload /></el-icon>
        上传文件（{{ fileList.length }}/{{ maxCount }}）
      </el-button>
    </el-upload>

    <div v-if="fileList.length" class="file-list">
      <div v-for="(file, idx) in fileList" :key="idx" class="file-item">
        <el-icon class="file-icon"><Document /></el-icon>
        <div class="file-info">
          <div class="file-name" :title="file.fileName">{{ file.fileName }}</div>
          <div class="file-meta">
            {{ formatSize(file.fileSize) }}
            <span class="file-type">{{ (file.fileType || '').toUpperCase() }}</span>
          </div>
        </div>
        <el-button type="danger" link @click="removeFile(idx)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>

    <div v-else class="empty-tip">暂无文件</div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Upload, Document, Delete } from '@element-plus/icons-vue';
import { uploadFile, deleteFile } from '@/api/upload';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  maxCount: { type: Number, default: 10 },
  accept: {
    type: String,
    default: '.jcd,.stl,.3dm,.obj,.step,.stp,.stpz,.magics,.mgx,.zpr,.fbx,.zip,.rar,.7z'
  },
  type: { type: String, default: 'dataPackage' },
  maxSizeMB: { type: Number, default: 200 },
});
const emit = defineEmits(['update:modelValue']);

const uploading = ref(false);
const fileList = computed(() => props.modelValue || []);

const handleUpload = async (options) => {
  const file = options.file;
  if (file.size > props.maxSizeMB * 1024 * 1024) {
    ElMessage.error(`文件不能超过 ${props.maxSizeMB}MB`);
    return;
  }
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await uploadFile(fd, props.type);
    const data = res?.data || res;
    if (!data?.url) throw new Error('上传返回异常');

    const newList = [...fileList.value, {
      fileName: data.fileName || file.name,
      fileUrl: data.url,
      fileSize: data.fileSize || file.size,
      fileType: data.fileType || file.name.split('.').pop().toLowerCase(),
      sortOrder: fileList.value.length,
    }];
    emit('update:modelValue', newList);
    ElMessage.success(`「${file.name}」上传成功`);
  } catch (e) {
    ElMessage.error(e.message || '上传失败');
  } finally {
    uploading.value = false;
  }
};

const removeFile = async (idx) => {
  const file = fileList.value[idx];
  const newList = fileList.value.filter((_, i) => i !== idx);
  emit('update:modelValue', newList);
  try { await deleteFile(file.fileUrl); } catch {}
};

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};
</script>

<style scoped>
.multi-file-upload { width: 100%; }
.file-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.file-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; background: #f7f8fa; border-radius: 6px;
  border: 1px solid #e8ecf1;
}
.file-icon { color: #409EFF; font-size: 18px; flex-shrink: 0; }
.file-info { flex: 1; min-width: 0; }
.file-name { font-size: 13px; color: #1d2129; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-meta { font-size: 12px; color: #86909c; margin-top: 2px; }
.file-type { margin-left: 8px; padding: 1px 6px; background: #e8f3ff; color: #409EFF; border-radius: 3px; font-size: 11px; }
.empty-tip { margin-top: 8px; font-size: 12px; color: #c0c4cc; text-align: center; padding: 8px; }
</style>
