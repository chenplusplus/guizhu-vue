<!-- src/components/ImageUpload.vue -->
<template>
  <div class="image-upload">
    <div
      class="image-preview"
      :class="{ 'has-image': imageUrl }"
      @dragover.prevent
      @drop.prevent="handleDrop"
      @paste="handlePaste"
    >
      <template v-if="imageUrl">
        <img :src="imageUrl" alt="预览图" />
        <div class="image-actions">
          <el-button type="primary" link @click="triggerFileInput">替换</el-button>
          <el-button type="danger" link @click="handleRemove">删除</el-button>
        </div>
      </template>
      <template v-else>
        <div class="upload-placeholder">
          <el-icon><Picture /></el-icon>
          <p>点击或拖拽/粘贴图片到此区域</p>
          <p class="tip">支持 jpg、png、gif、webp 格式，最大5MB</p>
          <el-button type="primary" @click="triggerFileInput">选择图片</el-button>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleFileChange"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { uploadImage } from '@/api/upload'

const props = defineProps({
  modelValue: { type: String, default: '' },
  type: { type: String, default: 'product' } // product / data / letter
})

const emit = defineEmits(['update:modelValue'])

const imageUrl = ref(props.modelValue)
const fileInput = ref(null)
const uploading = ref(false)

watch(() => props.modelValue, (newVal) => {
  imageUrl.value = newVal
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (file) {
    await uploadFile(file)
  }
  fileInput.value.value = ''
}

const handleDrop = async (e) => {
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    await uploadFile(file)
  } else {
    ElMessage.warning('请拖拽图片文件')
  }
}

const handlePaste = async (e) => {
  const items = e.clipboardData.items
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      await uploadFile(file)
      break
    }
  }
}

// ⭐ 核心：上传到服务器
const uploadFile = async (file) => {
  if (uploading.value) return

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片不能超过 5MB')
    return
  }

  uploading.value = true
  try {
    // 调用上传接口
    const res = await uploadImage(file, props.type)
    if (res.success) {
      imageUrl.value = res.url
      emit('update:modelValue', res.url)
      ElMessage.success('上传成功')
    } else {
      ElMessage.error(res.message || '上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}

const handleRemove = () => {
  imageUrl.value = ''
  emit('update:modelValue', '')
  ElMessage.info('图片已删除')
}
</script>

<style scoped>
.image-upload { width: 100%; }

.image-preview {
  width: 100%;
  min-height: 200px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background-color: #fafafa;
  transition: all 0.3s;
}

.image-preview.has-image {
  border: 1px solid #409EFF;
  background-color: #fff;
}

.image-preview img {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
}

.upload-placeholder .el-icon { font-size: 48px; margin-bottom: 10px; }
.upload-placeholder p { margin: 5px 0; }
.upload-placeholder .tip { font-size: 12px; color: #ccc; }

.image-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  margin-top: -40px;
  position: relative;
  border-radius: 0 0 8px 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-preview:hover .image-actions { opacity: 1; }
</style>