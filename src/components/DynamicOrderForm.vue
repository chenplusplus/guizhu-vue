<!-- components/DynamicOrderForm.vue -->
<template>
  <div class="dynamic-form">
    <a-form :model="formData" :rules="formRules" ref="formRef">
      <a-row :gutter="16">
        <a-col 
          v-for="field in visibleFields" 
          :key="field.name"
          :span="field.span || 8"
        >
          <a-form-item 
            :label="field.label"
            :name="field.name"
            :required="field.isRequired"
          >
            <!-- 根据字段类型渲染不同控件 -->
            <template v-if="field.canEdit">
              <!-- 下拉选择 -->
              <a-select 
                v-if="field.type === 'select'"
                v-model:value="formData[field.name]"
                :options="field.options"
                :placeholder="`请选择${field.label}`"
              />
              <!-- 数字输入 -->
              <a-input-number 
                v-else-if="field.type === 'number'"
                v-model:value="formData[field.name]"
                :min="0"
                :step="field.step || 0.01"
                :precision="field.precision || 2"
                style="width: 100%"
              />
              <!-- 文本输入 -->
              <a-input 
                v-else
                v-model:value="formData[field.name]"
                :placeholder="`请输入${field.label}`"
              />
            </template>
            
            <!-- 只读模式 -->
            <template v-else>
              <div class="field-value">
                {{ formatValue(field, formData[field.name]) }}
              </div>
            </template>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { usePermStore } from '@/stores/permStore';

const props = defineProps({
  module: { type: String, default: 'Order' },
  orderData: { type: Object, default: () => ({}) },
  mode: { type: String, default: 'view' } // view/edit/audit
});

const permStore = usePermStore();
const formRef = ref();
const formData = ref({});

// 获取当前角色的字段配置
const fieldConfig = ref({});

onMounted(async () => {
  await permStore.loadFieldPermissions(props.module);
  const roleId = permStore.currentRole;
  fieldConfig.value = await getFieldConfig(roleId, props.module);
  
  // 初始化表单数据
  if (props.orderData) {
    formData.value = { ...props.orderData };
  }
});

// 计算可见字段（按排序顺序）
const visibleFields = computed(() => {
  const perms = permStore.fieldPerms[props.module];
  if (!perms) return [];
  
  return perms.allPermissions
    .filter(p => p.canView)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(p => ({
      name: p.fieldName,
      label: p.fieldLabel,
      type: getFieldType(p.fieldName),
      canEdit: props.mode === 'edit' && p.canEdit,
      isRequired: p.isRequired,
      span: getFieldSpan(p.fieldName),
      options: getFieldOptions(p.fieldName)
    }));
});

// 字段类型映射
const getFieldType = (fieldName) => {
  const typeMap = {
    'Color': 'select',
    'Status': 'select',
    'LossRate': 'select',
    'Quantity': 'number',
    'TotalWeight': 'number',
    'NetWeight': 'number',
    'GoldPrice': 'number',
    'PackingFee': 'number',
    'TotalAmount': 'number'
  };
  return typeMap[fieldName] || 'text';
};

// 字段占位列数
const getFieldSpan = (fieldName) => {
  const spanMap = {
    'ProductName': 8,
    'Remark': 8,
    'MainStone': 8
  };
  return spanMap[fieldName] || 6;
};

// 格式化显示值
const formatValue = (field, value) => {
  if (value === null || value === undefined) return '-';
  if (field.type === 'number') return Number(value).toFixed(2);
  return value;
};
</script>

<style scoped>
.field-value {
  padding: 4px 11px;
  background: #f5f5f5;
  border-radius: 4px;
  min-height: 32px;
  line-height: 24px;
}
</style>