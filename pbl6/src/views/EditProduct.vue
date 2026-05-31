<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../stores/product.js'
import { useUserStore } from '../stores/user.js'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()
const userStore = useUserStore()

const productId = parseInt(route.params.id)

const formData = ref({
  title: '',
  description: '',
  price: '',
  category: '其他'
})

const selectedFile = ref(null)
const imagePreview = ref(null)
const originalImage = ref(null)
const categories = ['书籍教材', '电子数码', '生活用品', '交通工具', '体育用品', '服饰鞋包', '美妆护肤', '其他']
const errorMessage = ref('')
const isLoading = ref(true)

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

const loadProduct = async () => {
  isLoading.value = true
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products/${productId}`)
    const data = await response.json()
    
    if (data.product) {
      formData.value = {
        title: data.product.title,
        description: data.product.description,
        price: String(data.product.price),
        category: data.product.category
      }
      originalImage.value = `http://127.0.0.1:5000${data.product.image}`
      imagePreview.value = originalImage.value
    } else {
      throw new Error('商品不存在')
    }
  } catch (error) {
    errorMessage.value = error.message
    console.error('加载商品失败:', error)
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async () => {
  if (!formData.value.title || !formData.value.price) {
    errorMessage.value = '请填写商品标题和价格'
    return
  }
  
  if (isNaN(formData.value.price) || parseFloat(formData.value.price) <= 0) {
    errorMessage.value = '请输入有效的价格'
    return
  }
  
  if (!userStore.token) {
    errorMessage.value = '请先登录'
    router.push('/login')
    return
  }
  
  try {
    await productStore.updateProduct(productId, {
      title: formData.value.title,
      description: formData.value.description,
      price: parseFloat(formData.value.price),
      category: formData.value.category,
      image: selectedFile.value
    }, userStore.token)
    
    alert('商品更新成功！')
    router.push('/')
  } catch (error) {
    errorMessage.value = error.message || '更新失败，请重试'
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  loadProduct()
})
</script>

<template>
  <div class="edit-container">
    <div class="header">
      <h1>编辑商品</h1>
      <button @click="goBack" class="back-button">返回</button>
    </div>
    
    <div v-if="isLoading" class="loading">
      加载中...
    </div>
    
    <div v-else class="content">
      <form @submit.prevent="handleSubmit" class="edit-form">
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
        
        <button type="submit" class="submit-button">保存修改</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.edit-container {
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

.loading {
  text-align: center;
  padding: 80px 20px;
  color: #7C3AED;
}

.loading::after {
  content: '';
  display: block;
  width: 36px;
  height: 36px;
  margin: 16px auto;
  border: 3px solid #EDE9FE;
  border-top-color: #7C3AED;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.content {
  max-width: 600px;
  margin: 24px auto;
  padding: 0 20px 40px;
}

.edit-form {
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

.submit-button:hover {
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