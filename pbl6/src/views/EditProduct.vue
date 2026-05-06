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
const categories = ['数码', '书籍', '服装', '生活用品', '运动', '其他']
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
  background-color: #f5f5f5;
}

.header {
  background-color: white;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  color: #333;
  margin: 0;
  font-size: 24px;
}

.back-button {
  padding: 10px 20px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.back-button:hover {
  background-color: #555;
}

.loading {
  text-align: center;
  padding: 50px;
  color: #666;
}

.content {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
}

.edit-form {
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
  font-weight: bold;
}

input, select, textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
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
  display: block;
  width: 100%;
  height: 200px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.3s, background-color 0.3s;
}

.image-upload-label:hover {
  border-color: #4CAF50;
  background-color: #f9f9f9;
}

.upload-placeholder {
  text-align: center;
  color: #999;
}

.upload-placeholder span {
  display: block;
  font-size: 48px;
  margin-bottom: 10px;
  color: #ccc;
}

.image-preview {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.error-message {
  color: #f44336;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: center;
}

.submit-button {
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

.submit-button:hover {
  background-color: #45a049;
}
</style>