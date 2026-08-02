<!-- src/views/login/index.vue -->
<template>
  <div class="login-container">
    <el-card class="login-box" shadow="always">
      <template #header>
        <div class="login-header">
          <h1>💎 珠宝加工订单系统</h1>
          <p>订单全生命周期管理</p>
        </div>
      </template>

      <el-form :model="form" :rules="rules" ref="formRef" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            style="width: 100%"
            :loading="loading"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>

        <div class="login-hint">
          <span>测试账号：</span>
          <el-tag size="small" type="info">admin / 123456</el-tag>
          <el-tag size="small" type="success">zhangfei / 123456 (客户)</el-tag>
          <el-tag size="small" type="warning">wangwu / 123456 (工厂)</el-tag>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';
import { login } from '@/api/auth';

const router = useRouter();
const userStore = useUserStore();
const formRef = ref(null);
const loading = ref(false);

const form = reactive({
  username: 'admin',
  password: '123456',
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

const handleLogin = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    loading.value = true;
    try {
      const res = await login(form.username, form.password);
      if (res.success) {
        userStore.setUser({
          userId: res.userId,
          username: res.username,
          realName: res.realName,
          userType: res.userType,
          customerId: res.customerId,
          customerName: res.customerName,
          roleId: res.roleId,
        });
        ElMessage.success('登录成功');
        router.push('/dashboard');
      } else {
        ElMessage.error(res.message || '登录失败');
      }
    } catch (error) {
      ElMessage.error(error.message || '登录失败，请检查网络');
    } finally {
      loading.value = false;
    }
  });
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-box {
  width: 400px;
  border-radius: 12px;
}

.login-header {
  text-align: center;
}

.login-header h1 {
  font-size: 24px;
  color: #333;
  margin-bottom: 4px;
}

.login-header p {
  color: #999;
  font-size: 14px;
  margin: 0;
}

.login-hint {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}
</style>