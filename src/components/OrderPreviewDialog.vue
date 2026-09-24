<template>
  <el-dialog
    v-model="visible"
    :title="`订单预览 - ${orderData?.orderNo || ''}`"
    fullscreen
    destroy-on-close
    class="order-preview-dialog"
    @open="onOpen"
  >
    <div v-loading="loading" class="preview-body">

      <!-- ===== 顶部信息条 ===== -->
      <div class="preview-header">
        <span class="header-item"><span class="label">订单号：</span><span class="value">{{ orderData?.orderNo || '-' }}</span></span>
        <span class="header-item"><span class="label">客户：</span><span class="value">{{ orderData?.customerName || '-' }}</span></span>
        <span class="header-item"><span class="label">业务员：</span><span class="value">{{ orderData?.salesman || '-' }}</span></span>
        <span class="header-item">
          <span class="label">状态：</span>
          <el-tag :type="getStatusType(orderData?.flowStatus)" size="small">{{ getStatusText(orderData?.flowStatus) }}</el-tag>
        </span>
        <span class="header-item"><span class="label">下单日期：</span><span class="value">{{ formatDate(orderData?.orderDate) }}</span></span>
      </div>

      <!-- ===== 订单信息 ===== -->
      <div class="section-title">📋 订单信息</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">品名</td>
            <td class="value-td">{{ orderData?.productName || '-' }}</td>
            <td class="label-td">成色</td>
            <td class="value-td">
              <span class="color-dot" :style="{ background: currentPurityColor }"></span>
              {{ orderData?.color || '-' }}
            </td>
            <td class="label-td">手寸/长度</td>
            <td class="value-td">{{ orderData?.size || '-' }}</td>
            <td class="label-td">数量</td>
            <td class="value-td">{{ orderData?.quantity || '-' }}</td>
            <td class="label-td">颜色</td>
            <td class="value-td">{{ orderData?.gemColor || '-' }}</td>
          </tr>
          <tr>
            <td class="label-td">宽/厚度</td>
            <td class="value-td">{{ orderData?.widthThick || '-' }}</td>
            <td class="label-td">克重要求</td>
            <td class="value-td">{{ orderData?.weightRequirement || '-' }}</td>
            <td class="label-td">钻石级别</td>
            <td class="value-td">{{ orderData?.diamondLevel || '-' }}</td>
            <td class="label-td">工期</td>
            <td class="value-td">{{ orderData?.deliveryDays || '-' }} 天</td>
            <td class="label-td">LOGO</td>
            <td class="value-td">{{ orderData?.logoText || '-' }}</td>
          </tr>
          <tr>
            <td class="label-td">网址</td>
            <td class="value-td" colspan="9">
              <a v-if="orderData?.url" class="link" :href="orderData.url" target="_blank">{{ orderData.url }}</a>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 工厂数据 ===== -->
      <div class="section-title">📊 工厂数据</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">总重(g)</td>
            <td class="value-td">{{ orderData?.totalWeight ?? '-' }}</td>
            <td class="label-td">净重(g)</td>
            <td class="value-td">{{ orderData?.netWeight ?? '-' }}</td>
            <td class="label-td">损耗率</td>
            <td class="value-td">{{ orderData?.lossRate ?? '-' }}</td>
            <td class="label-td">加耗重</td>
            <td class="value-td">{{ orderData?.addLossWeight ?? '-' }}</td>
            <td class="label-td">金价</td>
            <td class="value-td money">{{ formatMoney(orderData?.goldPrice) }}</td>
          </tr>
          <tr>
            <td class="label-td">足金料克重(g)</td>
            <td class="value-td">{{ orderData?.goldMaterialWeight ?? '-' }}</td>
            <td class="label-td">足金料金额</td>
            <td class="value-td money">{{ formatMoney(orderData?.goldMaterialFee) }}</td>
            <td class="label-td">折现金</td>
            <td class="value-td" colspan="5">
              <el-tag :type="orderData?.goldConvertCash ? 'warning' : 'info'" size="small">
                {{ orderData?.goldConvertCash ? '是' : '否' }}
              </el-tag>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 主石 ===== -->
      <div class="section-title">💎 主石信息</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">石重(ct)</td>
            <td class="value-td">{{ orderData?.mainStoneWeight ?? '-' }}</td>
            <td class="label-td">单价(元)</td>
            <td class="value-td money">{{ formatMoney(orderData?.mainStonePrice) }}</td>
            <td class="label-td">粒数</td>
            <td class="value-td">{{ orderData?.mainStoneQty ?? 0 }}</td>
            <td class="label-td">镶石工费</td>
            <td class="value-td money">{{ formatMoney(orderData?.mainStoneSettingFee) }}</td>
            <td class="label-td">金额</td>
            <td class="value-td money">{{ formatMoney(orderData?.mainStoneAmount) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 副石 ===== -->
      <div class="section-title">💎 副石信息</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">石重(ct)</td>
            <td class="value-td">{{ orderData?.subStoneWeight ?? '-' }}</td>
            <td class="label-td">单价(元)</td>
            <td class="value-td money">{{ formatMoney(orderData?.subStonePrice) }}</td>
            <td class="label-td">粒数</td>
            <td class="value-td">{{ orderData?.subStoneQty ?? 0 }}</td>
            <td class="label-td">镶石工费</td>
            <td class="value-td money">{{ formatMoney(orderData?.subStoneSettingFee) }}</td>
            <td class="label-td">金额</td>
            <td class="value-td money">{{ formatMoney(orderData?.subStoneAmount) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 其他费用 ===== -->
      <div class="section-title">📦 其他费用</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">包装费</td>
            <td class="value-td money">{{ formatMoney(orderData?.packingFee) }}</td>
            <td class="label-td">证书费</td>
            <td class="value-td money">{{ formatMoney(orderData?.certificateFee) }}</td>
            <td class="label-td">邮费</td>
            <td class="value-td money">{{ formatMoney(orderData?.postageFee) }}</td>
            <td class="label-td">版费</td>
            <td class="value-td money">{{ formatMoney(orderData?.moldFee) }}</td>
            <td class="label-td">工费</td>
            <td class="value-td money">{{ formatMoney(orderData?.laborFee) }}</td>
          </tr>
          <tr class="total-row">
            <td class="label-td total-label">合计金额</td>
            <td class="value-td total-value" colspan="9">
              ¥{{ formatMoney(orderData?.totalAmount) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 备注 ===== -->
      <div class="section-title">📝 备注</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="value-td remark-cell" colspan="10">{{ orderData?.remark || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 图片区 ===== -->
      <div class="section-title" v-if="hasImages">🖼️ 图片附件</div>
      <div class="image-section" v-if="hasImages">
        <div class="image-group" v-if="productImages.length">
          <div class="image-label">产品图片（{{ productImages.length }}）</div>
          <div class="image-list">
            <el-image v-for="(img, i) in productImages" :key="'p' + i" :src="img.imageUrl" fit="cover" class="preview-img"
              :preview-src-list="productImages.map(x => x.imageUrl)" :initial-index="i" preview-teleported />
          </div>
        </div>
        <div class="image-group" v-if="dataImages.length">
          <div class="image-label">数据图（{{ dataImages.length }}）</div>
          <div class="image-list">
            <el-image v-for="(img, i) in dataImages" :key="'d' + i" :src="img.imageUrl" fit="cover" class="preview-img"
              :preview-src-list="dataImages.map(x => x.imageUrl)" :initial-index="i" preview-teleported />
          </div>
        </div>
        <div class="image-group" v-if="letterImages.length || letterRefImages.length">
          <div class="image-label">
            字印图
            <span v-if="letterImages.length" style="color:#409EFF;">要求 {{ letterImages.length }}</span>
            <span v-if="letterRefImages.length" style="color:#E6A23C; margin-left:8px;">参考 {{ letterRefImages.length }}</span>
          </div>
          <div class="image-list">
            <el-image v-for="(img, i) in letterImages" :key="'l' + i" :src="img.imageUrl" fit="cover" class="preview-img letter-img"
              :preview-src-list="[...letterImages, ...letterRefImages].map(x => x.imageUrl)" :initial-index="i" preview-teleported />
            <el-image v-for="(img, i) in letterRefImages" :key="'lr' + i" :src="img.imageUrl" fit="cover" class="preview-img letter-ref-img"
              :preview-src-list="[...letterImages, ...letterRefImages].map(x => x.imageUrl)" :initial-index="letterImages.length + i" preview-teleported />
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { getOrderDetail } from '@/api/order';
import { dictApi } from '@/api/dict';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  orderId: { type: [Number, String], default: null },
});
const emit = defineEmits(['update:modelValue']);

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const loading = ref(false);
const orderData = ref({});
const purityDict = ref([]);

const onOpen = async () => {
  if (!props.orderId) return;
  loading.value = true;
  try {
    const res = await getOrderDetail(props.orderId);
    orderData.value = res?.data || {};
  } catch (e) {
    orderData.value = {};
  } finally {
    loading.value = false;
  }
};

const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待客户审核', type: 'warning' },
  customeraudited: { text: '待工厂接单', type: 'success' },
  factory_edit: { text: '工厂编辑中', type: 'primary' },
  accepted: { text: '已接单', type: 'primary' },
  dataConfirm: { text: '数据确认', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  partsMissing: { text: '配件缺失', type: 'warning' },
  stoneReady: { text: '配石完成', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  glue: { text: '滴胶/磨石', type: 'primary' },
  inlay: { text: '镶嵌', type: 'primary' },
  assembly: { text: '组装', type: 'primary' },
  polishing: { text: '制作完成待审核', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'info' },
  scrapped: { text: '已报废', type: 'danger' },
};
const getStatusText = (s) => statusMap[s]?.text || s || '-';
const getStatusType = (s) => statusMap[s]?.type || 'info';

const formatMoney = (v) => (v === null || v === undefined || v === '') ? '0.00' : Number(v).toFixed(2);
const formatDate = (d) => {
  if (!d) return '-';
  const dd = new Date(d);
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
};

const currentPurityColor = computed(() => {
  const label = (orderData.value?.color || '').trim();
  if (label && purityDict.value.length) {
    const item = purityDict.value.find(x => x.itemLabel === label);
    if (item) {
      try {
        const extra = item.extraData ? JSON.parse(item.extraData) : {};
        if (extra.color) return extra.color;
      } catch {}
    }
  }
  return '#DCDFE6';
});

const productImages = computed(() => (orderData.value?.images || []).filter(x => x.imageType === 'product'));
const dataImages = computed(() => (orderData.value?.images || []).filter(x => x.imageType === 'data'));
const letterImages = computed(() => (orderData.value?.images || []).filter(x => x.imageType === 'letter'));
const letterRefImages = computed(() => (orderData.value?.images || []).filter(x => x.imageType === 'letter_ref'));
const hasImages = computed(() =>
  productImages.value.length || dataImages.value.length ||
  letterImages.value.length || letterRefImages.value.length);

dictApi.getItemsByKey('purity').then(res => { purityDict.value = res?.data || []; }).catch(() => {});
</script>

<style scoped>
.preview-body {
  padding: 4px 8px;
}

/* ===== 顶部信息条 ===== */
.preview-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  padding: 10px 16px;
  background: #f8faff;
  border: 1px solid #e8f0fe;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 14px;
}
.header-item .label { color: #909399; }
.header-item .value { color: #303133; font-weight: 500; }

/* ===== 分区标题 ===== */
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin: 12px 0 6px;
  text-align: left;
}

/* ===== Excel 表格：10 列 ===== */
.excel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
  margin-bottom: 8px;
}
.excel-table td {
  border: 1px solid #000;
  padding: 5px 6px;
  height: 30px;
  vertical-align: middle;
  word-break: break-all;
  overflow: hidden;
}
/* 标签列固定窄一点 */
.excel-table td.label-td {
  background: #f5f7fa;
  text-align: center;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  width: 80px;
}
.excel-table td.value-td {
  color: #303133;
  background: #fff;
  width: auto;
}
.excel-table td.value-td.money {
  color: #f56c6c;
  font-weight: 600;
}
.excel-table td.value-td.link {
  color: #409EFF;
  text-decoration: none;
}

/* ===== 合计 ===== */
.total-row .total-label {
  background: #fff8e6;
  color: #E6A23C;
  font-weight: 700;
}
.total-row .total-value {
  background: #fff8e6;
  color: #f56c6c;
  font-weight: 700;
  font-size: 18px;
  text-align: right;
  padding-right: 20px;
}

/* ===== 备注 ===== */
.remark-cell {
  min-height: 60px;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* ===== 成色点 ===== */
.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  vertical-align: middle;
  margin-right: 4px;
}

/* ===== 图片区 ===== */
.image-section {
  padding: 12px 16px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #e8ecf1;
  margin-bottom: 8px;
}
.image-group {
  margin-bottom: 12px;
}
.image-group:last-child {
  margin-bottom: 0;
}
.image-label {
  font-size: 13px;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 8px;
}
.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.preview-img {
  width: 120px;
  height: 120px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #e8ecf1;
  object-fit: cover;
  background: #fafafa;
}
.letter-img {
  border: 2px solid #409EFF;
}
.letter-ref-img {
  border: 2px dashed #E6A23C;
}
</style>