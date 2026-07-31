<template>
  <div ref="sheetContainer" class="univer-container" :style="{ height: height }"></div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { UniverSheet, ModeEnum } from 'tor-univer-sheet'

const props = defineProps({
  height: { type: String, default: '400px' },
  data: { type: Array, default: () => [] },
  columns: { type: Array, default: () => [] },
  mode: { type: String, default: 'edit' },
  readonly: { type: Boolean, default: false }
})

const emit = defineEmits(['change', 'loaded'])
const sheetContainer = ref(null)
let sheetInstance = null

const initSheet = () => {
  if (!sheetContainer.value) return
  sheetInstance = new UniverSheet({
    container: sheetContainer.value,
    mode: props.readonly ? ModeEnum.view : ModeEnum.edit,
    showImportFilePlugin: true
  })
  emit('loaded', sheetInstance)
  if (props.data.length) loadData()
}

const loadData = () => {
  if (!sheetInstance) return
  const headers = props.columns.map(c => c.title)
  const rows = props.data.map((row, idx) => [
    idx + 1, ...props.columns.map(c => row[c.field] ?? '')
  ])
  sheetInstance.setSheetData(0, 0, [headers, ...rows])
}

const getData = () => {
  if (!sheetInstance) return []
  const raw = sheetInstance.getWorkbookData()
  const rows = raw?.sheets?.[0]?.cellData || []
  if (rows.length < 2) return []
  return rows.slice(1).filter(r => r[1]?.v).map(r => {
    const obj = {}
    props.columns.forEach((c, i) => { obj[c.field] = r[i + 1]?.v ?? '' })
    return obj
  })
}

const clear = () => { sheetInstance?.clearSheet() }

onMounted(() => { nextTick(initSheet) })

watch(() => props.data, () => { if (props.data.length) loadData() }, { deep: true })

defineExpose({ getData, clear, loadData, sheetInstance })
</script>

<style scoped>
.univer-container { width: 100%; border: 1px solid #dcdfe6; border-radius: 4px; }
</style>