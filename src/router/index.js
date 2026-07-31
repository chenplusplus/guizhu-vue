import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '@/components/Layout.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Index.vue'),
        meta: { title: '工作台', icon: 'DataAnalysis' }
      },
      {
        path: 'user',
        name: 'UserList',
        component: () => import('@/views/system/UserList.vue'),
        meta: { title: '用户管理', icon: 'User' }
      },
      {
        path: 'role',
        name: 'RoleList',
        component: () => import('@/views/system/RoleList.vue'),
        meta: { title: '角色管理', icon: 'UserRole' }
      },
     {
        path: 'menu',
        name: 'MenuList',
        component: () => import('@/views/system/MenuList.vue'),
        meta: { title: '菜单管理', icon: 'Menu' }
      },
      {
        path: 'customer',
        name: 'Customer',
        component: () => import('@/views/customer/CustomerList.vue'),
        meta: { title: '客户管理', icon: 'User' }
      },
      {
        path: 'order',
        name: 'OrderList',
        component: () => import('@/views/order/OrderList.vue'),
        meta: { title: '订单列表', icon: 'List' }
      },
      {
        path: 'order/create',
        name: 'OrderCreate',
        component: () => import('@/views/order/OrderCreate.vue'),
        meta: { title: '新建订单', icon: 'Edit' }
      },
      {
        path: 'order/detail/:id',
        name: 'OrderDetail',
        component: () => import('@/views/order/OrderDetail.vue'),
        meta: { title: '订单详情' }
      },
      {
        path: 'production',
        name: 'Production',
        component: () => import('@/views/production/ProductionManage.vue'),
        meta: { title: '制作管理', icon: 'Setting' }
      },
      {
        path: 'bill',
        name: 'BillList',
        component: () => import('@/views/bill/BillList.vue'),
        meta: { title: '账单管理', icon: 'Document' }
      },
      {
        path: 'dict',
        name: 'DictManage',
        component: () => import('@/views/dict/DictManage.vue'),
        meta: { title: '基础资料', icon: 'Tools' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router