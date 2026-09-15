<template>
  <div class="multi-image-upload">
    <div class="image-list">
      <div
        v-for="(img, index) in images"
        :key="img.id || index"
        class="image-item"
      >
        <el-image
          :src="img.imageUrl"
          fit="cover"
          :preview-src-list="images.map(x => x.imageUrl)"
          :initial-index="index"
          class="preview-img"
        />
        <div class="image-actions">
          <el-button type="danger" link size="small" @click.stop="removeImage(index)">删除</el-button>
        </div>
      </div>

      <div class="image-add" @click="triggerFileInput" v-if="images.length < maxCount">
        <el-icon><Plus /></el-icon>
        <span>添加</span>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      style="display: none"
      @change="handleFileChange"
    />

    <div class="upload-tip" v-if="tip">{{ tip }}</div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { uploadImage } from '@/api/upload'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  maxCount: { type: Number, default: 10 },
  type: { type: String, default: 'product' },
  tip: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const images = ref([...(props.modelValue || [])])
const fileInput = ref(null)

watch(() => props.modelValue, (val) => {
  images.value = [...(val || [])]
})

watch(images, (val) => {
  emit('update:modelValue', val)
}, { deep: true })

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleFileChange = async (e) => {
  const files = Array.from(e.target.files || [])
  if (!files.length) return

  for (const file of files) {
    if (images.value.length >= props.maxCount) {
      ElMessage.warning(`最多上传 ${props.maxCount} 张`)
      break
    }
    if (file.size > 5 * 1024 * 1024) {
      ElMessage.warning(`${file.name} 超过 5MB`)
      continue
    }

    try {
      const res = await uploadImage(file, props.type)
      if (res.success) {
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api$/, '')
        const rawUrl = res.url || res.data?.url
        const url = rawUrl?.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`
        images.value.push({
          id: null,
          imageType: props.type,
          imageUrl: url,
          imageName: file.name,
          sortOrder: images.value.length,
          remark: ''
        })
      }
    } catch (err) {
      ElMessage.error(`${file.name} 上传失败`)
    }
  }

  fileInput.value.value = ''
}

const removeImage = (index) => {
  images.value.splice(index, 1)
}
</script>

<style scoped>
.multi-image-upload { width: 100%; }
.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.image-item {
  position: relative;
  width: 80px;
  height: 80px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  background: #fafafa;
}
.preview-img {
  width: 100%;
  height: 100%;
}
.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.55);
  text-align: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.image-item:hover .image-actions { opacity: 1; }
.image-add {
  width: 80px;
  height: 80px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #909399;
  font-size: 12px;
  transition: all 0.2s;
}
.image-add:hover {
  border-color: #409EFF;
  color: #409EFF;
}
.image-add .el-icon { font-size: 20px; margin-bottom: 2px; }
.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>