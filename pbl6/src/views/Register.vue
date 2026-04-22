<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const formData = ref({
  email: '',
  nickname: '',
  password: '',
  confirmPassword: ''
})

const errorMessage = ref('')

const handleSubmit = async () => {
  if (!formData.value.email || !formData.value.password || !formData.value.confirmPassword) {
    errorMessage.value = '请填写所有必填字段'
    return
  }
  
  if (formData.value.password !== formData.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }
  
  if (formData.value.password.length < 6) {
    errorMessage.value = '密码长度至少为6位'
    return
  }
  
  try {
    await userStore.register(formData.value.email, formData.value.password, formData.value.nickname)
    router.push('/login')
  } catch (error) {
    errorMessage.value = error.message || '注册失败，请重试'
  }
}
</script>

<template>
  <div class="register-container">
    <div class="register-box">
      <h2>二手校园交易平台</h2>
      <h3>用户注册</h3>
      
      <form @submit.prevent="handleSubmit" class="register-form">
        <div class="form-group">
          <label for="email">邮箱 *</label>
          <input 
            type="email" 
            id="email" 
            v-model="formData.email" 
            placeholder="请输入邮箱"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="nickname">昵称</label>
          <input 
            type="text" 
            id="nickname" 
            v-model="formData.nickname" 
            placeholder="请输入昵称（可选）"
          >
        </div>
        
        <div class="form-group">
          <label for="password">密码 *</label>
          <input 
            type="password" 
            id="password" 
            v-model="formData.password" 
            placeholder="请输入密码（至少6位）"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">确认密码 *</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="formData.confirmPassword" 
            placeholder="请再次输入密码"
            required
          >
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button type="submit" class="register-button">注册</button>
        
        <div class="login-link">
          已有账号？<router-link to="/login">立即登录</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.register-box {
  background-color: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 10px;
}

h3 {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-weight: normal;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.error-message {
  color: #f44336;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
}

.register-button {
  width: 100%;
  padding: 14px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.register-button:hover {
  background-color: #45a049;
}

.register-button:active {
  background-color: #3d8b40;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}

.login-link a {
  color: #4CAF50;
  text-decoration: none;
  font-weight: bold;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>