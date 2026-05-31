<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const formData = ref({
  email: '',
  password: ''
})

const errorMessage = ref('')

const handleSubmit = async () => {
  if (!formData.value.email || !formData.value.password) {
    errorMessage.value = '请填写所有必填字段'
    return
  }
  
  try {
    await userStore.login(formData.value.email, formData.value.password)
    router.push('/')
  } catch (error) {
    errorMessage.value = error.message || '登录失败，请重试'
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-box">
      <h2>二手校园交易平台</h2>
      <h3>用户登录</h3>
      
      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="email">邮箱</label>
          <input 
            type="email" 
            id="email" 
            v-model="formData.email" 
            placeholder="请输入邮箱"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="password">密码</label>
          <input 
            type="password" 
            id="password" 
            v-model="formData.password" 
            placeholder="请输入密码"
            required
          >
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button type="submit" class="login-button">登录</button>
        
        <div class="register-link">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #FAF5FF 0%, #EDE9FE 40%, #F3E8FF 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  padding: 20px;
}

.login-box {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(16px);
  padding: 44px 40px;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(124, 58, 237, 0.12), 0 2px 10px rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 400px;
  border: 1px solid rgba(124, 58, 237, 0.08);
  animation: fadeInUp 0.5s ease;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

h2 {
  text-align: center;
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 6px;
  font-size: 22px;
  font-weight: 700;
}

h3 {
  text-align: center;
  color: #6B7280;
  margin-bottom: 32px;
  font-weight: 500;
  font-size: 16px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #4C1D95;
  font-size: 14px;
  font-weight: 600;
}

input {
  width: 100%;
  padding: 13px 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 15px;
  transition: all 0.25s ease;
  background: #FAF5FF;
  outline: none;
  box-sizing: border-box;
}

input:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

input::placeholder {
  color: #A78BFA;
  opacity: 0.6;
}

.error-message {
  color: #EF4444;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
  background: #FEF2F2;
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid #FEE2E2;
}

.login-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
  letter-spacing: 0.3px;
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);
}

.login-button:active {
  transform: translateY(0);
}

.register-link {
  text-align: center;
  margin-top: 24px;
  color: #6B7280;
  font-size: 14px;
}

.register-link a {
  color: #7C3AED;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.2s;
}

.register-link a:hover {
  color: #6D28D9;
  text-decoration: underline;
}

.login-button:hover {
  background-color: #45a049;
}

.login-button:active {
  background-color: #3d8b40;
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}

.register-link a {
  color: #4CAF50;
  text-decoration: none;
  font-weight: bold;
}

.register-link a:hover {
  text-decoration: underline;
}
</style>