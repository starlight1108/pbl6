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

const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff', 'tif']

const handleAvatarChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !allowedExtensions.includes(ext)) {
      message.value = '不支持的图片格式，仅支持: png, jpg, jpeg, gif, webp, bmp, tiff'
      event.target.value = ''
      return
    }

    avatarFile.value = file
    message.value = ''

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
          <p class="hint">支持 png, jpg, jpeg, gif, webp, bmp, tiff 格式</p>
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
  background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  padding: 16px 40px;
  box-shadow: 0 1px 3px rgba(124, 58, 237, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(124, 58, 237, 0.1);
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #EDE9FE;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #7C3AED;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 10px;
  transition: all 0.2s;
}

.back-button:hover { background: #7C3AED; color: white; }

.header h1 {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.placeholder { width: 80px; }

.profile-form {
  max-width: 420px;
  margin: 40px auto;
  background: white;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.avatar-section { margin-bottom: 30px; }

.avatar-section h3 {
  color: #4C1D95;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
}

.avatar-upload { display: flex; flex-direction: column; align-items: center; }

.avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #A78BFA;
  margin-bottom: 16px;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.2);
}

.avatar-image { width: 100%; height: 100%; object-fit: cover; }

.upload-button {
  padding: 10px 24px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}

.upload-button:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35); }

.file-input { display: none; }

.hint { font-size: 12px; color: #A78BFA; margin-top: 8px; }

.form-group { margin-bottom: 24px; }

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #4C1D95;
  font-size: 14px;
  font-weight: 600;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 14px;
  background: #FAF5FF;
  outline: none;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

.disabled-input { background: #F3F4F6; color: #9CA3AF; }

.message {
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 20px;
  text-align: center;
  font-weight: 500;
}

.message.success { background: #DCFCE7; color: #22C55E; border: 1px solid #BBF7D0; }
.message.error { background: #FEE2E2; color: #EF4444; border: 1px solid #FECACA; }

.submit-button {
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

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4);
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none;
}
</style>
