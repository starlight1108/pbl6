<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '../stores/product.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const productStore = useProductStore()
const userStore = useUserStore()

const formData = ref({
  title: '',
  description: '',
  price: '',
  category: '其他'
})

const selectedFile = ref(null)
const imagePreview = ref(null)
const categories = ['书籍教材', '电子数码', '生活用品', '交通工具', '体育用品', '服饰鞋包', '美妆护肤', '其他']
const errorMessage = ref('')
const isLoading = ref(false)

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const handleSubmit = async () => {
  console.log('=== 开始发布商品 ===')
  console.log('FormData:', formData.value)
  console.log('User store - isLoggedIn:', userStore.isLoggedIn)
  console.log('User store - token:', userStore.token ? '存在 (' + userStore.token.length + '字符)' : '空')
  console.log('User store - userId:', userStore.userId)
  console.log('LocalStorage user:', localStorage.getItem('user') ? '存在' : '不存在')
  
  if (!formData.value.title || !formData.value.price) {
    errorMessage.value = '请填写商品标题和价格'
    return
  }
  
  if (isNaN(formData.value.price) || formData.value.price <= 0) {
    errorMessage.value = '请输入有效的价格'
    return
  }
  
  if (!userStore.token) {
    errorMessage.value = '请先登录'
    router.push('/login')
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    console.log('发布商品 - Token前20字符:', userStore.token.substring(0, 20) + '...')
    console.log('发布商品 - 用户ID:', userStore.userId)
    
    await productStore.addProduct({
      name: formData.value.title,
      description: formData.value.description,
      price: parseFloat(formData.value.price),
      category: formData.value.category,
      image: selectedFile.value
    }, userStore.token)
    
    alert('商品发布成功！')
    router.push('/')
  } catch (error) {
    console.error('发布商品失败:', error)
    errorMessage.value = error.message || '发布失败，请重试'
    
    if (error.message.includes('401') || error.message.includes('未授权')) {
      errorMessage.value = '登录状态失效，请重新登录'
      setTimeout(() => {
        userStore.logout()
        router.push('/login')
      }, 2000)
    }
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  console.log('PublishProduct mounted')
  console.log('User isLoggedIn:', userStore.isLoggedIn)
  console.log('User token exists:', !!userStore.token)
  console.log('User token:', userStore.token ? '***' : '空')
  
  if (!userStore.isLoggedIn) {
    console.log('用户未登录，跳转登录页')
    router.push('/login')
  }
})
</script>

<template>
  <div class="publish-container">
    <div class="header">
      <h1>发布商品</h1>
      <button @click="goBack" class="back-button">返回</button>
    </div>
    
    <div class="content">
      <form @submit.prevent="handleSubmit" class="publish-form">
        <div class="form-group">
          <label for="title">商品标题 *</label>
          <input 
            type="text" 
            id="title" 
            v-model="formData.title" 
            placeholder="请输入商品标题"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="price">价格 (元) *</label>
          <input 
            type="number" 
            id="price" 
            v-model="formData.price" 
            placeholder="请输入价格"
            step="0.01"
            min="0"
            required
          >
        </div>
        
        <div class="form-group">
          <label for="category">分类</label>
          <select id="category" v-model="formData.category">
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="image">商品图片</label>
          <div class="image-upload-container">
            <input 
              type="file" 
              id="image" 
              accept="image/*"
              @change="handleFileChange"
              class="image-upload-input"
            >
            <label for="image" class="image-upload-label">
              <div v-if="imagePreview" class="image-preview">
                <img :src="imagePreview" alt="预览">
              </div>
              <div v-else class="upload-placeholder">
                <span>+</span>
                <p>点击上传图片</p>
              </div>
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <label for="description">商品描述</label>
          <textarea 
            id="description" 
            v-model="formData.description" 
            placeholder="请输入商品描述（可选）"
            rows="5"
          ></textarea>
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        
        <button type="submit" :disabled="isLoading" class="submit-button">
          {{ isLoading ? '发布中...' : '发布商品' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.publish-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  padding: 16px 24px;
  box-shadow: 0 1px 3px rgba(124, 58, 237, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(124, 58, 237, 0.1);
}

.header h1 {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.back-button {
  padding: 10px 22px;
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

.back-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
}

.content {
  max-width: 600px;
  margin: 24px auto;
  padding: 0 20px 40px;
}

.publish-form {
  background: white;
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.form-group {
  margin-bottom: 22px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #4C1D95;
  font-size: 14px;
  font-weight: 600;
}

input, select, textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 15px;
  background: #FAF5FF;
  transition: all 0.25s ease;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}

input:focus, select:focus, textarea:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

input::placeholder, textarea::placeholder {
  color: #A78BFA;
  opacity: 0.6;
}

select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%237C3AED' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

textarea {
  resize: vertical;
  min-height: 100px;
}

.image-upload-container {
  position: relative;
}

.image-upload-input {
  display: none;
}

.image-upload-label {
  display: flex;
  width: 100%;
  height: 200px;
  border: 2px dashed #C4B5FD;
  border-radius: 14px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background: #FAF5FF;
}

.image-upload-label:hover {
  border-color: #7C3AED;
  background: #EDE9FE;
}

.upload-placeholder {
  text-align: center;
  color: #A78BFA;
}

.upload-placeholder span {
  display: block;
  font-size: 40px;
  margin-bottom: 8px;
  color: #C4B5FD;
}

.upload-placeholder p {
  margin: 0;
  font-size: 14px;
}

.image-preview {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 12px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.error-message {
  color: #EF4444;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
  padding: 12px 16px;
  background: #FEF2F2;
  border-radius: 12px;
  border: 1px solid #FEE2E2;
}

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