// src/stores/user.js
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    userId: (state) => state?.user?.userId || 0,
    userName: (state) => state?.user?.username || '',
    realName: (state) => state?.user?.realName || '',
    userType: (state) => state?.user?.userType || '',
    userTypeName: (state) => {
      const map = {
        customer: '客户下单员',
        customerAudit: '客户审核员',
        factoryOrder: '工厂操作员',
        factoryAudit: '工厂审核员',
        admin: '管理员',
      };
      return map[state?.user?.userType] || state?.user?.userType || '未知角色';
    },
    customerId: (state) => state?.user?.customerId || null,
    customerName: (state) => state?.user?.customerName || '',
    roleId: (state) => state?.user?.roleId || 0,

    // ============================================================
    // ⭐ 角色判断 getters
    // ============================================================
    isCustomer: (state) => state?.user?.userType === 'customer',
    isCustomerAudit: (state) => state?.user?.userType === 'customerAudit',  // ⭐ 新增
    isFactoryOrder: (state) => state?.user?.userType === 'factoryOrder',
    isFactoryAudit: (state) => state?.user?.userType === 'factoryAudit',
    isAdmin: (state) => state?.user?.userType === 'admin',
    
    // ⭐ 客户类型（包含客户下单员和客户审核员）
    isCustomerType: (state) => {
      const type = state?.user?.userType;
      return type === 'customer' || type === 'customerAudit';
    },
    // ⭐ 工厂类型（包含工厂操作员和工厂审核员）
    isFactoryType: (state) => {
      const type = state?.user?.userType;
      return type === 'factoryOrder' || type === 'factoryAudit';
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