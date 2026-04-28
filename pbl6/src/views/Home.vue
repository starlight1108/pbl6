<script setup>
import { useUserStore } from '../stores/user.js'
import { useProductStore } from '../stores/product.js'
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'

const userStore = useUserStore()
const productStore = useProductStore()
const router = useRouter()
const isDropdownOpen = ref(false)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
  isDropdownOpen.value = false
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const handlePublish = () => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  router.push('/products/publish')
  isDropdownOpen.value = false
}

const goToProducts = () => {
  router.push('/products')
}

const goToDetail = (productId) => {
  router.push(`/products/${productId}`)
}

onMounted(async () => {
  await productStore.fetchProducts()
})
</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1>二手校园交易平台</h1>
      <div class="header-actions">
        <span v-if="userStore.isLoggedIn">欢迎，{{ userStore.nickname || userStore.email }}</span>
        <router-link v-else to="/login" class="login-link">登录</router-link>
        <div class="dropdown">
          <button @click="toggleDropdown" class="dropdown-button">菜单</button>
          <div v-if="isDropdownOpen" class="dropdown-menu">
            <button @click="handlePublish" class="dropdown-item publish-item">发布商品</button>
            <button v-if="userStore.isLoggedIn" @click="handleLogout" class="dropdown-item logout-item">退出登录</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="content">
      <h2>首页</h2>
      <p>这里是二手校园交易平台的首页，您可以在这里浏览和发布二手商品。</p>
      
      <div class="products-section">
        <div class="section-header">
          <h3>最新商品</h3>
          <button @click="goToProducts" class="view-all-button">查看全部</button>
        </div>
        
        <div v-if="productStore.products.length === 0" class="no-products">
          <p>暂无商品，快去发布第一个商品吧！</p>
          <button @click="handlePublish" class="publish-button">发布商品</button>
        </div>
        
        <div v-else class="products-grid">
          <div 
            v-for="product in productStore.products.slice(0, 8)" 
            :key="product.id" 
            class="product-card"
            @click="goToDetail(product.id)"
          >
            <div class="product-image">
              <span class="category-tag">{{ product.category }}</span>
            </div>
            <div class="product-info">
              <h4>{{ product.title }}</h4>
              <p class="product-price">¥{{ product.price }}</p>
              <p class="product-seller">卖家：{{ product.seller?.nickname || '匿名' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-actions span {
  color: #333;
  font-size: 16px;
}

.login-link {
  color: #4CAF50;
  text-decoration: none;
  font-weight: bold;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.dropdown-button {
  padding: 8px 16px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.dropdown-button:hover {
  background-color: #555;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 5px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 120px;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.publish-item {
  color: #4CAF50;
}

.logout-item {
  color: #f44336;
}

.content {
  max-width: 1200px;
  margin: 40px auto;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.content h2 {
  color: #333;
  margin-bottom: 10px;
}

.content p {
  color: #666;
  font-size: 16px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.products-section {
  margin-top: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  color: #333;
  font-size: 20px;
  margin: 0;
}

.view-all-button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.view-all-button:hover {
  background-color: #45a049;
}

.no-products {
  background-color: #f9f9f9;
  padding: 40px;
  text-align: center;
  border-radius: 8px;
  border: 1px dashed #ddd;
}

.no-products p {
  color: #999;
  font-size: 16px;
  margin-bottom: 20px;
}

.publish-button {
  padding: 12px 24px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.publish-button:hover {
  background-color: #45a049;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
}

.product-card {
  background-color: white;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
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

.product-info h4 {
  color: #333;
  margin: 0 0 10px 0;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price {
  color: #f44336;
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.product-seller {
  color: #999;
  font-size: 14px;
  margin: 0;
}
</style>