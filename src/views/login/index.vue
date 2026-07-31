<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-title"><h1>💎 珠宝加工订单系统</h1><p>登录后开始管理您的订单</p></div>
      <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="handleLogin">
        <el-form-item prop="username"><el-input v-model="form.username" placeholder="用户名" size="large" prefix-icon="User" /></el-form-item>
        <el-form-item prop="password"><el-input v-model="form.password" type="password" placeholder="密码" size="large" prefix-icon="Lock" show-password /></el-form-item>
        <el-button type="primary" size="large" :loading="loading" @click="handleLogin" style="width:100%;">登录</el-button>
      </el-form>
      <div class="login-tips">默认：admin / 123456</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const loading = ref(false)
const form = reactive({ username: 'admin', password: '123456' })
const rules = { username: [{ required: true, message: '请输入用户名' }], password: [{ required: true, message: '请输入密码' }] }

const handleLogin = async () => {
  await formRef.value?.validate()
  loading.value = true
  try { await userStore.login(form.username, form.password); ElMessage.success('登录成功'); router.push('/dashboard') }
  catch { ElMessage.error('登录失败') }
  finally { loading.value = false }
}
</script>

<style scoped>
.login-container { height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.login-box { width: 400px; padding: 48px 40px; background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.login-title { text-align: center; margin-bottom: 32px; }
.login-title h1 { font-size: 24px; color: #1d2129; margin-bottom: 8px; }
.login-title p { color: #86909c; font-size: 14px; }
.login-tips { margin-top: 16px; text-align: center; color: #86909c; font-size: 12px; }
</style>