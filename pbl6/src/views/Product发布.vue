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
  category: '其他'
})
const selectedFile = ref(null)

const categories = ['书籍教材', '电子数码', '生活用品', '交通工具', '体育用品', '服饰鞋包', '美妆护肤', '其他']

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    selectedFile.value = file
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
  
  if (!userStore.token) {
    alert('请先登录')
    router.push('/login')
    return
  }
  
  try {
    console.log('发布商品，token:', userStore.token)
    await productStore.addProduct({
      ...product.value,
      price: parseFloat(product.value.price),
      image: selectedFile.value
    }, userStore.token)
    
    alert('商品发布成功！')
    router.push('/')
  } catch (error) {
    console.error('发布失败:', error)
    alert('发布失败: ' + error.message)
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
          <label for="category">商品分类</label>
          <select id="category" v-model="product.category">
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
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

.back-button:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35); }

.content {
  max-width: 600px;
  margin: 40px auto;
  padding: 32px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.content h2 {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 24px;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
}

.form-group { margin-bottom: 18px; }

label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #4C1D95;
  font-size: 14px;
}

input, textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 15px;
  background: #FAF5FF;
  outline: none;
  transition: all 0.25s ease;
  box-sizing: border-box;
  font-family: inherit;
}

input:focus, textarea:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

textarea { height: 100px; resize: vertical; }

.submit-button {
  display: block;
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
  margin-top: 20px;
  letter-spacing: 0.3px;
}

.submit-button:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(124, 58, 237, 0.4); }
</style>