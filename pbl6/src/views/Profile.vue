<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const nickname = ref('')
const avatarPreview = ref('')
const avatarFile = ref(null)
const isLoading = ref(false)
const message = ref('')

const getAvatarUrl = (path) => {
  const baseUrl = 'http://127.0.0.1:5000'
  if (path && path.startsWith('/')) {
    return baseUrl + path
  } else if (path) {
    return baseUrl + '/' + path
  }
  return baseUrl + '/static/images/default-avatar.png'
}

const handleAvatarChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    avatarFile.value = file
    
    const reader = new FileReader()
    reader.onload = (e) => {
      avatarPreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const handleSubmit = async () => {
  if (!nickname.value && !avatarFile.value) {
    message.value = '请至少修改一项信息'
    return
  }

  isLoading.value = true
  message.value = ''

  try {
    const formData = new FormData()
    
    if (nickname.value) {
      formData.append('nickname', nickname.value)
    }
    
    if (avatarFile.value) {
      formData.append('avatar', avatarFile.value)
    }

    const response = await fetch('http://127.0.0.1:5000/api/user/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      },
      body: formData
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '修改失败')
    }

    message.value = '修改成功！'
    
    userStore.nickname = data.user.nickname
    userStore.avatar = data.user.avatar
    
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      user.nickname = data.user.nickname
      user.avatar = data.user.avatar
      localStorage.setItem('user', JSON.stringify(user))
    }

    setTimeout(() => {
      router.push('/')
    }, 1500)
  } catch (error) {
    message.value = error.message || '修改失败'
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  nickname.value = userStore.nickname
  avatarPreview.value = getAvatarUrl(userStore.avatar)
})
</script>

<template>
  <div class="profile-container">
    <div class="header">
      <button @click="goBack" class="back-button">← 返回</button>
      <h1>个人信息</h1>
      <div class="placeholder"></div>
    </div>

    <div class="profile-form">
      <div class="avatar-section">
        <h3>头像</h3>
        <div class="avatar-upload">
          <div class="avatar-preview">
            <img :src="avatarPreview" alt="头像预览" class="avatar-image">
          </div>
          <label class="upload-button">
            <input type="file" accept="image/*" @change="handleAvatarChange" class="file-input">
            上传头像
          </label>
          <p class="hint">支持 png, jpg, jpeg, gif 格式</p>
        </div>
      </div>

      <div class="form-group">
        <label for="nickname">昵称</label>
        <input 
          type="text" 
          id="nickname" 
          v-model="nickname" 
          placeholder="请输入昵称"
          class="form-input"
        >
      </div>

      <div class="form-group">
        <label for="email">邮箱</label>
        <input 
          type="email" 
          id="email" 
          :value="userStore.email" 
          disabled
          class="form-input disabled-input"
        >
      </div>

      <div v-if="message" :class="['message', message.includes('成功') ? 'success' : 'error']">
        {{ message }}
      </div>

      <button @click="handleSubmit" :disabled="isLoading" class="submit-button">
        {{ isLoading ? '保存中...' : '保存修改' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background-color: white;
  padding: 20px 40px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-button {
  background: none;
  border: none;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  padding: 8px 16px;
}

.back-button:hover {
  color: #4CAF50;
}

.header h1 {
  color: #333;
  font-size: 20px;
  margin: 0;
}

.placeholder {
  width: 80px;
}

.profile-form {
  max-width: 400px;
  margin: 40px auto;
  background-color: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.avatar-section {
  margin-bottom: 30px;
}

.avatar-section h3 {
  color: #333;
  margin-bottom: 16px;
  font-size: 14px;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-preview {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #4CAF50;
  margin-bottom: 16px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-button {
  padding: 10px 24px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.upload-button:hover {
  background-color: #45a049;
}

.file-input {
  display: none;
}

.hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.disabled-input {
  background-color: #f5f5f5;
  color: #999;
}

.message {
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  text-align: center;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
}

.submit-button {
  width: 100%;
  padding: 14px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: #45a049;
}

.submit-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
