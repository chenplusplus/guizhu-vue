// src/stores/user.js
import { defineStore } from 'pinia';

const getNormalizedUserType = (state) => {
  const rawType = state?.user?.userType || state?.user?.user_type || state?.user?.UserType || state?.user?.roleCode || '';
  const normalized = String(rawType).trim().replace(/[_-]/g, '').toLowerCase();
  return {
    factoryaudit: 'factoryAudit',
    factoryorder: 'factoryOrder',
    customeraudit: 'customerAudit',
    businessaudit: 'businessAudit',
    admin: 'admin',
    customer: 'customer'
  }[normalized] || rawType;
};

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    userId: (state) => state?.user?.userId || 0,
    userName: (state) => state?.user?.username || '',
    realName: (state) => state?.user?.realName || '',
    userType: (state) => getNormalizedUserType(state),
    userTypeName: (state) => {
      const map = {
        customer: '客户下单员',
        customerAudit: '客户审核员',
        factoryOrder: '工厂操作员',
        factoryAudit: '工厂审核员',
        admin: '管理员',
      };
      const type = getNormalizedUserType(state);
      return map[type] || type || '未知角色';
    },
    customerId: (state) => state?.user?.customerId || null,
    customerName: (state) => state?.user?.customerName || '',
    roleId: (state) => state?.user?.roleId || 0,

    // ============================================================
    // ⭐ 角色判断 getters
    // ============================================================
    isCustomer: (state) => getNormalizedUserType(state) === 'customer',
    isCustomerAudit: (state) => getNormalizedUserType(state) === 'customerAudit',
    isFactoryOrder: (state) => getNormalizedUserType(state) === 'factoryOrder',
    isFactoryAudit: (state) => getNormalizedUserType(state) === 'factoryAudit',
    isAdmin: (state) => getNormalizedUserType(state) === 'admin',
    
    // ⭐ 客户类型（包含客户下单员和客户审核员）
    isCustomerType: (state) => {
      const type = getNormalizedUserType(state);
      return type === 'customer' || type === 'customerAudit';
    },
    // ⭐ 工厂类型（包含工厂操作员和工厂审核员）
    isFactoryType: (state) => {
      const type = getNormalizedUserType(state);
      return type === 'factoryOrder' || type === 'factoryAudit';
    },

    // ============================================================
    // ⭐ 角色专属工作台（登录落地 / 无权限兜底 / 标签页首页 统一用这个）
    //    通用工作台 /dashboard 已下线，每个角色只回自己的专门工作台
    // ============================================================
    homePath: (state) => {
      const type = getNormalizedUserType(state);
      switch (type) {
        case 'customer': return '/workbench/customer';
        case 'customerAudit': return '/workbench/customer-audit';
        case 'factoryOrder': return '/workbench/entry';
        case 'factoryAudit': return '/audit/workbench';
        case 'admin': return '/transaction/operating-dashboard';
        default: return '';   // 未知角色：由路由守卫拦回登录页，避免死循环
      }
    },
  },

  actions: {
    setUser(userData) {
      this.user = userData;
      localStorage.setItem('userInfo', JSON.stringify(userData));
    },
    clearUser() {
      this.user = null;
      localStorage.removeItem('userInfo');
    },
    async logout() {
      this.user = null;
      localStorage.removeItem('userInfo');
    },
  },
});