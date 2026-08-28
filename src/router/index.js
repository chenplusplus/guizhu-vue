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
  {
    path: '/',
    component: () => import('@/components/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      // ===== 工作台 =====
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '工作台' }
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
        path: 'inventory/detail',
        name: 'InventoryDetail',
        component: () => import('@/views/inventory/detail.vue'),
        meta: { title: '盘点详情', hidden: true }
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
        path: 'order/import',
        name: 'OrderImport',
        component: () => import('@/views/order/import.vue'),
        meta: { title: '导入Excel' }
      },

      // 退货记录
      {
        path: 'order/returns',
        name: 'ReturnList',
        component: () => import('@/views/order/return-list.vue'),
        meta: { title: '退货记录', icon: '↩️' }
      },

      // 账单统计
      {
        path: 'bill/stats',
        name: 'BillStats',
        component: () => import('@/views/order/bill-stats.vue'),
        meta: { title: '账单统计', icon: '📊' }
      },

      // ===== 账单模块 =====
      {
        path: 'order/bill/create',
        name: 'BillCreate',
        component: () => import('@/views/order/bill-create.vue'),
        meta: { title: '生成账单' }
      },
      // ⭐ 只保留一个 BillEdit,使用可选参数 :id?
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
        path: 'order/bill/detail/:id',
        name: 'BillDetail',
        component: () => import('@/views/order/bill-detail.vue'),
        meta: { title: '账单详情' }
      },
      {
        path: 'order/lr/edit/:billId',
        name: 'LrEditor',
        component: () => import('@/views/order/lr-editor.vue'),
        meta: { title: 'LR表编辑', icon: '📊', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'order/lr/list',
        name: 'LrList',
        component: () => import('@/views/order/lr-list.vue'),
        meta: { title: 'LR表管理', icon: '📊' }
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
        meta: { title: '操作日志', roles: ['admin'] }
      },

      // 在路由配置中添加流程管理相关路由
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
        path: 'inout/report/monthly',
        name: 'MonthlyTotal',
        component: () => import('@/views/inout/monthly-total.vue'),
        meta: { title: '月度总汇总', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'inout/report/counterparty',
        name: 'CounterpartySummary',
        component: () => import('@/views/inout/counterparty-summary.vue'),
        meta: { title: '往来单位汇总', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
      },
      {
        path: 'inout/reconciliation',
        name: 'Reconciliation',
        component: () => import('@/views/inout/reconciliation.vue'),
        meta: { title: '对账明细', roles: ['factoryOrder', 'factoryAudit', 'admin'] }
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
    ],
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
     next('/dashboard');
     return;
  }

  next();
});

export default router;