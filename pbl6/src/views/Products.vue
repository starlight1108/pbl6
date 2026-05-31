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
const categories = ['书籍教材', '电子数码', '生活用品', '交通工具', '体育用品', '服饰鞋包', '美妆护肤', '其他']

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

.user-info { display: flex; align-items: center; gap: 12px; }
.user-info span { color: #4C1D95; font-size: 15px; font-weight: 500; }

.login-link {
  color: #7C3AED;
  text-decoration: none;
  font-weight: 600;
}

.publish-button {
  padding: 8px 20px;
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25);
}

.publish-button:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35); }

.logout-button {
  padding: 8px 18px;
  background: #FEE2E2;
  color: #EF4444;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.logout-button:hover { background: #EF4444; color: white; }

.content { max-width: 1200px; margin: 24px auto; padding: 0 24px 60px; }

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-bar input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 15px;
  background: #FAF5FF;
  outline: none;
  transition: all 0.25s ease;
}

.search-bar input:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

.search-bar select {
  padding: 12px 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 14px;
  min-width: 120px;
  background: #FAF5FF;
  color: #4C1D95;
  outline: none;
  cursor: pointer;
}

.search-bar select:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}

.search-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}

.search-button:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35); }

.empty-message {
  text-align: center;
  color: #7C3AED;
  opacity: 0.6;
  padding: 60px;
  font-size: 16px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.product-card {
  background: white;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.06);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(124, 58, 237, 0.12);
}

.product-image {
  height: 150px;
  background: linear-gradient(135deg, #FAF5FF, #EDE9FE);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 10px;
}

.category-tag {
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
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