import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    userId: null,
    username: '',
    realName: '',
    role: '',
    userType: '',
    customerId: null,
    customerName: '',
    token: localStorage.getItem('token') || ''
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
    isAdmin: (state) => state.role === 'Admin'
  },
  actions: {
    async login(username, password) {
      try {
        const data = await authApi.login({ username, password })
        if (data.success) {
          this.userId = data.userId
          this.username = data.username
          this.realName = data.realName
          this.role = data.role
          this.userType = data.userType || 'customer'
          this.customerId = data.customerId || null
          this.customerName = data.customerName || ''
          this.token = 'logged_in'
          localStorage.setItem('token', 'logged_in')
          localStorage.setItem('user', JSON.stringify({
            userId: data.userId,
            username: data.username,
            realName: data.realName,
            role: data.role,
            userType: data.userType || 'customer',
            customerId: data.customerId || null,
            customerName: data.customerName || ''
          }))
          return { success: true }
        }
        return { success: false, message: '登录失败' }
      } catch (error) {
        return { success: false, message: error.response?.data?.message || '登录失败' }
      }
    },
    logout() {
      this.userId = null
      this.username = ''
      this.realName = ''
      this.role = ''
      this.userType = ''
      this.customerId = null
      this.customerName = ''
      this.token = ''
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      authApi.logout()
    },
    restore() {
      const u = localStorage.getItem('user')
      const token = localStorage.getItem('token')
      if (u && token) {
        const d = JSON.parse(u)
        this.userId = d.userId
        this.username = d.username
        this.realName = d.realName
        this.role = d.role
        this.userType = d.userType || 'customer'
        this.customerId = d.customerId || null
        this.customerName = d.customerName || ''
        this.token = token
        return true
      }
      return false
    }
  }
})