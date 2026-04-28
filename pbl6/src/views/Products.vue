<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '../stores/product.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const productStore = useProductStore()
const userStore = useUserStore()

const searchKeyword = ref('')
const selectedCategory = ref('')
const categories = ['数码', '书籍', '服装', '生活用品', '运动', '其他']

const handleSearch = async () => {
  await productStore.fetchProducts(1, 20, selectedCategory.value, searchKeyword.value)
}

const handleCategoryChange = async () => {
  await productStore.fetchProducts(1, 20, selectedCategory.value, searchKeyword.value)
}

const goToDetail = (productId) => {
  router.push(`/products/${productId}`)
}

const goToPublish = () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  router.push('/products/publish')
}

onMounted(async () => {
  await productStore.fetchProducts()
})
</script>

<template>
  <div class="products-container">
    <div class="header">
      <h1>二手校园交易平台</h1>
      <div class="user-info">
        <span v-if="userStore.isLoggedIn">欢迎，{{ userStore.nickname || userStore.email }}</span>
        <router-link v-else to="/login" class="login-link">登录</router-link>
        <button @click="goToPublish" class="publish-button">发布商品</button>
        <button v-if="userStore.isLoggedIn" @click="userStore.logout(); router.push('/login')" class="logout-button">退出</button>
      </div>
    </div>
    
    <div class="content">
      <div class="search-bar">
        <input 
          type="text" 
          v-model="searchKeyword" 
          placeholder="搜索商品..."
          @keyup.enter="handleSearch"
        >
        <select v-model="selectedCategory" @change="handleCategoryChange">
          <option value="">全部分类</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <button @click="handleSearch" class="search-button">搜索</button>
      </div>
      
      <div v-if="productStore.products.length === 0" class="empty-message">
        暂无商品，快来发布第一个商品吧！
      </div>
      
      <div class="products-grid">
        <div 
          v-for="product in productStore.products" 
          :key="product.id" 
          class="product-card"
          @click="goToDetail(product.id)"
        >
          <div class="product-image">
            <span class="category-tag">{{ product.category }}</span>
          </div>
          <div class="product-info">
            <h3 class="product-title">{{ product.title }}</h3>
            <p class="product-price">¥{{ product.price }}</p>
            <p class="product-seller">卖家：{{ product.seller?.nickname || '匿名' }}</p>
          </div>
        </div>
      </div>
      
      <div v-if="productStore.pages > 1" class="pagination">
        <button 
          :disabled="productStore.currentPage === 1"
          @click="productStore.fetchProducts(productStore.currentPage - 1)"
        >
          上一页
        </button>
        <span>第 {{ productStore.currentPage }} / {{ productStore.pages }} 页</span>
        <button 
          :disabled="productStore.currentPage === productStore.pages"
          @click="productStore.fetchProducts(productStore.currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.products-container {
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

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info span {
  color: #333;
  font-size: 16px;
}

.login-link {
  color: #4CAF50;
  text-decoration: none;
  font-weight: bold;
}

.publish-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.publish-button:hover {
  background-color: #45a049;
}

.logout-button {
  padding: 8px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.content {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-bar input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.search-bar select {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  min-width: 120px;
}

.search-button {
  padding: 12px 24px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.empty-message {
  text-align: center;
  color: #999;
  padding: 40px;
  font-size: 18px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.product-card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.product-image {
  height: 150px;
  background-color: #e0e0e0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 10px;
}

.category-tag {
  background-color: #4CAF50;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.product-info {
  padding: 15px;
}

.product-title {
  font-size: 16px;
  color: #333;
  margin: 0 0 10px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price {
  font-size: 20px;
  color: #f44336;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.product-seller {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
}

.pagination button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>