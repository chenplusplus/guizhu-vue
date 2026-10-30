// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false },
  },

  // ⭐⭐⭐ 独立全屏页面（不走 Layout，无菜单、无导航）⭐⭐⭐
  {
    path: '/audit-preview',
    name: 'AuditPreview',
    component: () => import('@/views/order/audit-preview.vue'),
    meta: { title: '待审核预览', requiresAuth: true }
  },

  {
    path: '/',
    component: () => import('@/components/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: () => {
      const userStore = useUserStore();
      return userStore.homePath || '/login';
    },
    children: [
      // ===== 审核工作台（仅工厂审核员 / 管理员） =====
      {
        path: 'audit/workbench',
        name: 'AuditWorkbench',
        component: () => import('@/views/audit/workbench.vue'),
        meta: { title: '审核工作台', roles: ['factoryAudit', 'admin'] }
      },

      // ===== 录入工作台（仅工厂操作员 / 管理员） =====
      {
        path: 'workbench/entry',
        name: 'EntryWorkbench',
        component: () => import('@/views/workbench/entry.vue'),
        meta: { title: '录入工作台', roles: ['factoryOrder', 'admin'] }
      },

      // ===== 客户下单工作台（客户下单员 / 管理员） =====
      {
        path: 'workbench/customer',
        name: 'CustomerWorkbench',
        component: () => import('@/views/workbench/customer.vue'),
        meta: { title: '下单工作台', roles: ['customer', 'admin'] }
      },

      // ===== 客户审核工作台（客户审核员 / 管理员） =====
      {
        path: 'workbench/customer-audit',
        name: 'CustomerAuditWorkbench',
        component: () => import('@/views/workbench/customer.vue'),
        meta: { title: '客户审核工作台', roles: ['customerAudit', 'admin'] }
      },

      // ===== 订单模块 =====
      {
        path: 'order/create/:id?',
        name: 'OrderCreate',
        component: () => import('@/views/order/create.vue'),
        meta: { title: '下单' }
      },
      {
        path: 'order/my-list',
        name: 'MyOrders',
        component: () => import('@/views/order/list.vue'),
        meta: { title: '我的订单' }
      },
      {
        path: 'order/alert',
        name: 'AlertList',
        component: () => import('@/views/order/alert-list.vue'),
        meta: { title: '预警管理' }
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/inventory/index.vue'),
        meta: { title: '盘点管理' }
      },
      {
        path: 'inventory/monthly',
        name: 'InventoryMonthly',
        component: () => import('@/views/inventory/monthly-report.vue'),
        meta: { title: '月度经营报表' }
      },
      {
        path: 'inventory/monthly-list',
        name: 'InventoryMonthlyList',
        component: () => import('@/views/inventory/monthly-list.vue'),
        meta: { title: '盘点核算', hidden: true }
      },
      {
        path: 'inventory/monthly/:yearMonth',
        name: 'InventoryMonthlyDetail',
        component: () => import('@/views/inventory/monthly-detail.vue'),
        meta: { title: '月度盘点详情', hidden: true }
      },
      {
        path: 'inventory/monthly-report/:yearMonth?',
        name: 'InventoryMonthlyReport',
        component: () => import('@/views/inventory/monthly-report.vue'),
        meta: { title: '月度经营报表', hidden: true }
      },
      {
        path: 'inventory/monthly-profit/:yearMonth?',
        name: 'MonthlyProfit',
        component: () => import('@/views/inventory/monthly-profit.vue'),
        meta: { title: '利润滚动表' }
      },
      { 
        path: 'order/audit', 
        name: 'OrderAudit', 
        component: () => import('@/views/order/audit.vue'),
        meta: { title: '订单审核' }
      },
      { 
        path: 'order/factory-audit',
        name: 'FactoryAudit',
        component: () => import('@/views/order/factory-audit.vue'),
        meta: { title: '工厂审核' }
      },
      {
        path: 'order/production',
        name: 'Production',
        component: () => import('@/views/order/production.vue'),
        meta: { title: '制作管理' }
      },
      {
        path: 'order/factory-list',
        name: 'FactoryList',
        component: () => import('@/views/order/factory-list.vue'),
        meta: { title: '工厂订单' }
      },
      // ⭐ 工厂订单按阶段拆分（复用同一个页面，meta.mode 决定只显示哪一段、只允许哪些操作）
      {
        path: 'order/factory-accept',
        name: 'FactoryAccept',
        component: () => import('@/views/order/factory-accept.vue'),
        meta: { title: '待接单', mode: 'accept', roles: ['factoryOrder', 'admin'] }
      },
      {
        path: 'order/factory-edit-list',
        name: 'FactoryEditList',
        component: () => import('@/views/order/factory-list.vue'),
        meta: { title: '订单编辑', mode: 'edit', roles: ['factoryOrder', 'admin'] }
      },
      {
        path: 'order/factory-audit-list',
        name: 'FactoryAuditList',
        component: () => import('@/views/order/factory-list.vue'),
        meta: { title: '待审核', mode: 'audit', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'order/factory-completed',
        name: 'FactoryCompleted',
        redirect: '/order/factory-history',
        meta: { title: '已完成订单', hidden: true }
      },
      {
        path: '/order/factory-batch-edit',
        name: 'FactoryBatchEdit',
        component: () => import('../views/order/factory-batch-edit.vue'),
        meta: { title: '批量编辑工厂订单', requiresAuth: true }
      },
      {
        path: '/order/factory-history',
        component: () => import('@/views/order/factory-history.vue'),
        meta: { title: '历史订单'}
      },
      {
        path: 'order/factory-edit/:id',
        name: 'FactoryEdit',
        component: () => import('@/views/order/factory-edit.vue'),
        meta: { title: '编辑订单' }
      },
      {
        path: 'order/list',
        name: 'OrderList',
        component: () => import('@/views/order/list.vue'),
        meta: { title: '订单管理' }
      },
      {
        path: 'order/detail/:id',
        name: 'OrderDetail',
        component: () => import('@/views/order/detail.vue'),
        meta: { title: '订单详情' }
      },
      {
        path: 'order/factory-production-audit',
        name: 'FactoryProductionAudit',
        component: () => import('@/views/order/factory-production-audit.vue'),
        meta: { title: '制作审核', roles: ['factoryAudit', 'admin'] }
      },
      {
        path: 'order/modify-list',
        name: 'OrderModifyList',
        component: () => import('@/views/order/modify-list.vue'),
        meta: { title: '修改订单', roles: ['customer', 'customerAudit', 'factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'order/import',
        name: 'OrderImport',
        component: () => import('@/views/order/import.vue'),
        meta: { title: '导入Excel' }
      },
      // ⭐ 已移除 audit-preview（移到顶级路由）

      // 退货记录
      {
        path: 'order/return',
        name: 'ReturnList',
        component: () => import('@/views/order/return-list.vue'),
        meta: { title: '退货记录', icon: '↩️' }
      },

      // ===== 账单模块 =====
      {
        path: 'order/bill/list',
        name: 'BillList',
        component: () => import('@/views/order/bill-list.vue'),
        meta: { title: '账单列表', roles: ['factoryOrder', 'admin'] }
      },
      {
        path: 'order/bill/create',
        name: 'BillCreate',
        component: () => import('@/views/order/bill-create.vue'),
        meta: { title: '生成账单' }
      },
      {
        path: 'order/bill/edit/:id?',
        name: 'BillEdit',
        component: () => import('@/views/order/bill-edit.vue'),
        meta: { title: '编辑出货单', roles: ['factoryOrder', 'admin'] }
      },
      {
        path: 'order/bill/audit',
        name: 'BillAudit',
        component: () => import('@/views/order/bill-audit.vue'),
        meta: { title: '账单审核' }
      },
      {
        path: 'order/bill/my-list',
        name: 'BillMyList',
        component: () => import('@/views/order/bill-my-list.vue'),
        meta: { title: '我的账单' }
      },
      {
        // ⭐ 账单收款（填写实际收款 → 提交审核）
        path: 'order/bill/receipt',
        name: 'BillReceipt',
        component: () => import('@/views/order/bill-my-list.vue'),
        meta: { title: '账单收款', roles: ['factoryOrder', 'admin'] }
      },
      {
        // ⭐ 账单收款审核（工厂审核员）
        path: 'order/bill/receipt-audit',
        name: 'BillReceiptAudit',
        component: () => import('@/views/order/bill-receipt-audit.vue'),
        meta: { title: '收款审核', roles: ['factoryAudit', 'admin'] }
      },
      {
        path: 'order/bill/detail/:id',
        name: 'BillDetail',
        component: () => import('@/views/order/bill-detail.vue'),
        meta: { title: '账单详情' }
      },
      {
        path: 'order/bill/export-detail',
        name: 'BillExportDetail',
        component: () => import('@/views/order/bill-export-detail.vue'),
        meta: { title: '出货明细', hidden: true }
      },
      {
        path: 'order/bill/tree',
        name: 'BillTreeView',
        component: () => import('@/views/order/bill-tree-view.vue'),
        meta: { title: '树形汇总' }
      },

      // 维修单
      {
        path: '/repair/create',
        name: 'RepairCreate',
        component: () => import('@/views/order/repair-order.vue'),
        meta: { title: '新建维修单' }
      },
      {
        path: '/repair',
        name: 'RepairList',
        redirect: '/order/factory-list',
        meta: { title: '维修单' }
      },
      {
        path: '/repair/edit/:id',
        name: 'RepairEdit',
        component: () => import('@/views/order/repair-order.vue'),
        meta: { title: '编辑维修单' }
      },

      // LR表
      {
        path: 'order/lr/edit/:billId',
        name: 'LrEditor',
        component: () => import('@/views/order/lr-editor.vue'),
        meta: { title: 'LR表编辑', icon: '📊', roles: ['factoryOrder', '工厂业务员', 'factoryAudit', '工厂审核员', 'admin'] }
      },
      {
        path: 'order/lr/list',
        name: 'LrList',
        component: () => import('@/views/order/lr-list.vue'),
        meta: { title: 'LR表管理', icon: '📊' }
      },
      {
        path: 'order/lr/tree',
        name: 'LrTree',
        component: () => import('@/views/order/lr-tree-view.vue'),
        meta: { title: 'LR表树形汇总', icon: '🌳', roles: ['factoryOrder', '工厂业务员', 'factoryAudit', '工厂审核员', 'admin'] }
      },
      {
        path: 'order/lr/tree-summary',
        name: 'LrTreeSummary',
        component: () => import('@/views/order/lr-tree-summary.vue'),
        meta: { title: 'LR表汇总', icon: '📊', roles: ['factoryOrder', '工厂业务员', 'factoryAudit', '工厂审核员', 'admin'] }
      },
            {
        path: 'order/customer-monthly-bill',
        name: 'CustomerMonthlyBill',
        component: () => import('@/views/order/customer-monthly-bill.vue'),
        meta: { title: '客户月度账单', roles: ['factoryOrder', '工厂业务员', 'factoryAudit', '工厂审核员', 'admin'] }
      },
      {
        path: 'order/customer-bill-detail',
        name: 'CustomerBillDetail',
        component: () => import('@/views/order/customer-bill-detail.vue'),
        meta: { title: '客户账单明细', hidden: true, roles: ['factoryOrder', '工厂业务员', 'factoryAudit', '工厂审核员', 'admin'] }
      },
            {
        path: 'order/lr/customer-profit',
        name: 'LrCustomerProfit',
        component: () => import('@/views/order/lr-customer-profit.vue'),
        meta: { title: '客户利润分析', icon: '??', roles: ['factoryOrder', '工厂业务员', 'factoryAudit', '工厂审核员', 'admin'] }
      },

      // ===== 客户模块 =====
      {
        path: 'customer/list',
        name: 'CustomerList',
        component: () => import('@/views/customer/list.vue'),
        meta: { title: '客户管理' }
      },

      // ===== 系统模块 =====
      {
        path: 'system/user',
        name: 'UserManage',
        component: () => import('@/views/system/user.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'system/menu',
        name: 'MenuList',
        component: () => import('@/views/system/MenuList.vue'),
        meta: { title: '菜单管理' }
      },
      {
        path: 'system/role',
        name: 'RoleList',
        component: () => import('@/views/system/RoleList.vue'),
        meta: { title: '角色管理' }
      },
      {
        path: 'dict/manage',
        name: 'DictManage',
        component: () => import('@/views/dict/DictManage.vue'),
        meta: { title: '数据字典', roles: ['admin'] }
      },
      {
        path: 'system/gold-price',
        name: 'GoldPrice',
        component: () => import('@/views/system/gold-price.vue'),
        meta: { title: '金价管理', roles: ['admin'] }
      },
      {
        path: 'system/diamond-price',
        name: 'DiamondPrice',
        component: () => import('@/views/system/diamond-price.vue'),
        meta: { title: '钻石价格', roles: ['admin'] }
      },
      {
        path: 'system/operation-log',
        name: 'OperationLog',
        component: () => import('@/views/system/operation-log.vue'),
        meta: { title: '操作日志', roles: ['admin', 'factoryOrder', 'factoryAudit'] }
      },
      {
        path: '/system/flow-config',
        name: 'FlowConfig',
        component: () => import('@/views/system/FlowConfig.vue'),
        meta: { title: '流程配置', icon: 'Setting', roles: ['admin'] }
      },

      // ===== 总进出模块 =====
      {
        path: 'inout/list',
        name: 'InoutList',
        component: () => import('@/views/inout/list.vue'),
        meta: { title: '总进出管理' }
      },
      {
        path: 'inout/create',
        name: 'InoutCreate',
        component: () => import('@/views/inout/create.vue'),
        meta: { title: '总进出录入' }
      },
      {
        path: 'inout/detail/:id',
        name: 'InoutDetail',
        component: () => import('@/views/inout/detail.vue'),
        meta: { title: '总进出详情' }
      },
      {
        path: 'inout/report/counterparty',
        name: 'CounterpartySummary',
        component: () => import('@/views/inout/counterparty-summary.vue'),
        meta: { title: '往来单位汇总', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },

      // ===== 总进出新模块（26分类×5维度矩阵） =====
      {
        path: 'transaction/input',
        name: 'TransactionInput',
        component: () => import('@/views/transaction/transaction-input.vue'),
        meta: { title: '数据录入', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'transaction/list',
        name: 'TransactionList',
        component: () => import('@/views/transaction/transaction-list.vue'),
        meta: { title: '交易列表', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'transaction/factory-summary',
        name: 'FactorySummary',
        component: () => import('@/views/transaction/factory-summary.vue'),
        meta: { title: '全工厂汇总', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'transaction/counterpart-summary',
        name: 'CounterpartSummary',
        component: () => import('@/views/transaction/counterpart-summary.vue'),
        meta: { title: '往来单位汇总', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'transaction/operating-dashboard',
        name: 'OperatingDashboard',
        component: () => import('@/views/transaction/operating-dashboard.vue'),
        meta: { title: '经营看板', roles: ['factoryOrder', '工厂业务员', 'factoryAudit', '工厂审核员', 'admin'] }
      },
      {
        path: 'system/counterparty',
        name: 'CounterpartyManage',
        component: () => import('@/views/inout/counterparty.vue'),
        meta: { title: '往来单位管理', roles: ['admin'] }
      },

      // ===== 师傅表（工序管理）模块 =====
      // 执模
      {
        path: 'process/zm-input',
        name: 'ZmInput',
        component: () => import('@/views/process/zm-input.vue'),
        meta: { title: '执模数据录入', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'process/zm-list',
        name: 'ZmList',
        component: () => import('@/views/process/zm-list.vue'),
        meta: { title: '执模单据列表', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      // 镶石
      {
        path: 'process/xs-input',
        name: 'XsInput',
        component: () => import('@/views/process/xs-input.vue'),
        meta: { title: '镶石数据录入', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'process/xs-list',
        name: 'XsList',
        component: () => import('@/views/process/xs-list.vue'),
        meta: { title: '镶石单据列表', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      // 抛光
      {
        path: 'process/pg-input',
        name: 'PgInput',
        component: () => import('@/views/process/pg-input.vue'),
        meta: { title: '抛光数据录入', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'process/pg-list',
        name: 'PgList',
        component: () => import('@/views/process/pg-list.vue'),
        meta: { title: '抛光单据列表', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      // 通用
      {
        path: 'process/zm-detail/:id',
        name: 'ZmDetail',
        component: () => import('@/views/process/process-detail.vue'),
        meta: { title: '执模详情', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'process/xs-detail/:id',
        name: 'XsDetail',
        component: () => import('@/views/process/process-detail.vue'),
        meta: { title: '镶石详情', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'process/pg-detail/:id',
        name: 'PgDetail',
        component: () => import('@/views/process/process-detail.vue'),
        meta: { title: '抛光详情', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'process/stats',
        name: 'ProcessStats',
        component: () => import('@/views/process/process-stats.vue'),
        meta: { title: '全局统计', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },

      // ===== 进销存（金/钻石/费用）新模块 =====
      // ⭐ 进 / 出 两个模块首页（大按钮直达三类录入）
      {
        path: 'inout/in-hub',
        name: 'InoutInHub',
        component: () => import('@/views/inout/hub.vue'),
        meta: { title: '进模块', direction: 1, roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'inout/out-hub',
        name: 'InoutOutHub',
        component: () => import('@/views/inout/hub.vue'),
        meta: { title: '出模块', direction: 0, roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      // 金：入库 / 出库
      {
        path: 'inout/gold/in',
        name: 'GoldIn',
        component: () => import('@/views/inout/gold-input.vue'),
        meta: { title: '金入库', direction: 1, roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'inout/gold/out',
        name: 'GoldOut',
        component: () => import('@/views/inout/gold-input.vue'),
        meta: { title: '金出库', direction: 0, roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: '/inout/gold-list',
        name: 'InoutGoldList',
        component: () => import('@/views/inout/gold-list.vue'),
        meta: { title: '金录入列表', requiresAuth: true }
      },
      // 钻石：入库 / 出库
      {
        path: 'inout/diamond/in',
        name: 'DiamondIn',
        component: () => import('@/views/inout/diamond-input.vue'),
        meta: { title: '钻石入库', direction: 1, roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'inout/diamond/out',
        name: 'DiamondOut',
        component: () => import('@/views/inout/diamond-input.vue'),
        meta: { title: '钻石出库', direction: 0, roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: '/inout/diamond-list',
        name: 'InoutDiamondList',
        component: () => import('@/views/inout/diamond-list.vue'),
        meta: { title: '钻石录入列表', requiresAuth: true }
      },
      // 费用：入 / 出
      {
        path: 'inout/expense/in',
        name: 'ExpenseIn',
        component: () => import('@/views/inout/expense-input.vue'),
        meta: { title: '费用入', direction: 1, roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'inout/expense/out',
        name: 'ExpenseOut',
        component: () => import('@/views/inout/expense-input.vue'),
        meta: { title: '费用出', direction: 0, roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: '/inout/expense-list',
        name: 'InoutExpenseList',
        component: () => import('@/views/inout/expense-list.vue'),
        meta: { title: '费用录入列表', requiresAuth: true }
      },
      {
        path: 'inout/material-loss-config',
        name: 'MaterialLossConfig',
        component: () => import('@/views/inout/material-loss-config.vue'),
        meta: { title: '供应商损耗率配置', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'inout/report-summary',
        name: 'InoutReportSummary',
        component: () => import('@/views/inout/report-summary.vue'),
        meta: { title: '进销存报表汇总', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
    ],
  },
  // ===== 兜底：未知 / 已下线的旧路径一律回各自的工作台（原来是空白页）=====
  {
    path: '/:pathMatch(.*)*',
    redirect: () => {
      const userStore = useUserStore();
      return userStore.homePath || '/login';
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  if (!to.meta.requiresAuth) {
    next();
    return;
  }

  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录');
    next('/login');
    return;
  }

  // 角色权限检查
  const currentRole = String(userStore.userType || '').trim().replace(/[_-]/g, '').toLowerCase();
  const allowedRoles = (to.meta.roles || []).map(role => String(role).replace(/[_-]/g, '').toLowerCase());
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
     ElMessage.warning('您没有访问该页面的权限');
     // 回各自的工作台；若连工作台都进不去（角色未配置）则停在原地，避免重定向死循环
     const home = userStore.homePath;
     if (home && home !== to.path) next(home);
     else next(false);
     return;
  }

  next();
});

export default router;