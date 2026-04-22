<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '../stores/product.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const productStore = useProductStore()
const userStore = useUserStore()
const product = ref({
  name: '',
  description: '',
  price: '',
  image: ''
})
const selectedFile = ref(null)

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
    // 读取文件为base64
    const reader = new FileReader()
    reader.onload = (e) => {
      product.value.image = e.target.result
      console.log('图片已转换为base64')
    }
    reader.readAsDataURL(file)
  }
}

const uploadImage = async (file) => {
  try {
    // 使用base64编码存储图片
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        console.log('图片已转换为base64')
        resolve({ success: true, filename: e.target.result })
      }
      reader.readAsDataURL(file)
    })
  } catch (error) {
    console.error('上传失败:', error)
    return Promise.reject(error)
  }
}

const submitForm = async () => {
  if (!product.value.name || !product.value.description || !product.value.price) {
    alert('请填写所有必填字段')
    return
  }
  
  if (isNaN(product.value.price) || parseFloat(product.value.price) <= 0) {
    alert('请输入有效的价格')
    return
  }
  
  try {
    // 如果选择了图片，上传图片
    if (selectedFile.value) {
      const uploadResult = await uploadImage(selectedFile.value)
      if (uploadResult.success) {
        product.value.image = uploadResult.filename
        console.log('图片上传成功:', uploadResult.filename)
      }
    }
    
    // 保存商品到store
    productStore.addProduct({
      ...product.value,
      price: parseFloat(product.value.price)
    }, userStore.username)
    
    console.log('发布商品:', product.value)
    alert('商品发布成功！')
    
    product.value = {
      name: '',
      description: '',
      price: '',
      image: ''
    }
    selectedFile.value = null
    document.getElementById('image').value = ''
  } catch (error) {
    console.error('发布失败:', error)
    alert('发布失败，请重试')
  }
}
</script>

<template>
  <div class="product发布">
    <div class="header">
      <h1>二手校园交易平台</h1>
      <button @click="router.push('/')" class="back-button">返回首页</button>
    </div>
    
    <div class="content">
      <h2>发布商品</h2>
      <form @submit.prevent="submitForm">
        <div class="form-group">
          <label for="name">商品名称</label>
          <input type="text" id="name" v-model="product.name" required>
        </div>
        <div class="form-group">
          <label for="description">商品描述</label>
          <textarea id="description" v-model="product.description" required></textarea>
        </div>
        <div class="form-group">
          <label for="price">商品价格</label>
          <input type="number" id="price" v-model="product.price" step="0.01" required>
        </div>
        <div class="form-group">
          <label for="image">商品图片</label>
          <input type="file" id="image" @change="handleFileChange">
        </div>
        <button type="submit" class="submit-button">发布商品</button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.product发布 {
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
  color: #4CAF50;
  margin: 0;
  font-size: 24px;
}

.back-button {
  padding: 8px 16px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #555;
}

.content {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.content h2 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

input, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

textarea {
  height: 100px;
  resize: vertical;
}

.submit-button {
  display: block;
  width: 100%;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s;
  margin-top: 20px;
}

.submit-button:hover {
  background-color: #45a049;
}
</style>