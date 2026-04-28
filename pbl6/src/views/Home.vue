<script setup>
import { useUserStore } from '../stores/user.js'
import { useProductStore } from '../stores/product.js'
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'

const userStore = useUserStore()
const productStore = useProductStore()
const router = useRouter()
const isDropdownOpen = ref(false)
const isLoading = ref(true)

const getAvatarUrl = () => {
  const baseUrl = 'http://127.0.0.1:5000'
  const defaultAvatar = '/static/images/default-avatar.png'
  
  if (userStore.avatar && userStore.avatar.startsWith('/')) {
    return baseUrl + userStore.avatar
  } else if (userStore.avatar) {
    return baseUrl + '/' + userStore.avatar
  } else {
    return baseUrl + defaultAvatar
  }
}

const getProductImageUrl = (imagePath) => {
  const baseUrl = 'http://127.0.0.1:5000'
  if (imagePath && imagePath.startsWith('/')) {
    return baseUrl + imagePath
  } else if (imagePath) {
    return baseUrl + '/' + imagePath
  }
  return baseUrl + '/static/images/default-product.png'
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
  isDropdownOpen.value = false
}

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

const handlePublish = () => {
  router.push('/publish')
  isDropdownOpen.value = false
}

const handleDeleteProduct = async (id) => {
  if (confirm('确定要删除这个商品吗？')) {
    const success = await productStore.deleteProduct(id, userStore.token)
    if (success) {
      alert('商品删除成功！')
    } else {
      alert('删除失败，请重试')
    }
  }
}

const handleEditProduct = (id) => {
  alert('编辑商品功能开发中...')
}

const handleToggleProductStatus = async (id) => {
  const success = await productStore.toggleProductStatus(id, userStore.token)
  if (success) {
    alert('商品状态更新成功！')
  } else {
    alert('更新失败，请重试')
  }
}

const handleViewDetail = (id) => {
  router.push(`/products/${id}`)
}

onMounted(async () => {
  isLoading.value = true
  try {
    await productStore.fetchProducts()
    console.log('商品列表:', productStore.products)
  } catch (error) {
    console.error('获取商品失败:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1>二手校园交易平台</h1>
      <div class="header-actions">
        <template v-if="userStore.isLoggedIn">
          <div class="user-info">
            <img :src="getAvatarUrl()" :alt="userStore.nickname" class="user-avatar">
            <span>欢迎，{{ userStore.nickname }}</span>
          </div>
          <div class="dropdown">
            <button @click="toggleDropdown" class="dropdown-button">菜单</button>
            <div v-if="isDropdownOpen" class="dropdown-menu">
              <button @click="handlePublish" class="dropdown-item publish-item">发布商品</button>
              <button @click="handleLogout" class="dropdown-item logout-item">退出登录</button>
            </div>
          </div>
        </template>
        <template v-else>
          <button @click="router.push('/login')" class="login-button">登录</button>
        </template>
      </div>
    </div>
    
    <div class="content">
      <h2>首页</h2>
      <p>这里是二手校园交易平台的首页，您可以在这里浏览和发布二手商品。</p>
      
      <div class="products-section">
        <h3>商品列表</h3>
        <div v-if="isLoading" class="loading">
          加载中...
        </div>
        <div v-else-if="productStore.products.length === 0" class="no-products">
          <p>暂无商品，快去发布第一个商品吧！</p>
        </div>
        <div v-else class="products-grid">
          <div v-for="product in productStore.products" :key="product.id" class="product-card" @click="handleViewDetail(product.id)">
            <div class="product-image">
              <img :src="getProductImageUrl(product.image)" :alt="product.title">
              <span class="category-tag">{{ product.category }}</span>
            </div>
            <div class="product-info">
              <div class="product-header">
                <h4>{{ product.title }}</h4>
                <div class="product-actions">
                  <button v-if="userStore.isAdmin || product.seller_id === userStore.id" @click.stop="handleEditProduct(product.id)" class="edit-button">修改</button>
                  <button v-if="userStore.isAdmin || product.seller_id === userStore.id" @click.stop="handleToggleProductStatus(product.id)" class="status-button">{{ product.status === 'active' ? '下架' : '上架' }}</button>
                  <button v-if="userStore.isAdmin" @click.stop="handleDeleteProduct(product.id)" class="delete-button">删除</button>
                </div>
              </div>
              <p class="product-seller">卖家：{{ product.seller?.nickname || '匿名' }}</p>
              <p class="product-description">{{ product.description }}</p>
              <p class="product-price">¥{{ product.price?.toFixed(2) }}</p>
              <p class="product-status" :class="{ 'inactive': product.status !== 'active' }">{{ product.status === 'active' ? '上架' : '下架' }}</p>
              <p class="product-date">{{ new Date(product.created_at).toLocaleString() }}</p>
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
  padding: 20px 40px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  color: #4CAF50;
  font-size: 24px;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #4CAF50;
}

.header-actions span {
  color: #333;
  font-size: 16px;
}

.login-button {
  padding: 10px 24px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.login-button:hover {
  background-color: #45a049;
}

.dropdown {
  position: relative;
}

.dropdown-button {
  padding: 8px 16px;
  background-color: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-top: 5px;
  min-width: 120px;
  z-index: 100;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
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
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.content h2 {
  color: #333;
  margin-bottom: 10px;
}

.content > p {
  color: #666;
  margin-bottom: 30px;
}

.products-section h3 {
  color: #333;
  margin-bottom: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.no-products {
  text-align: center;
  padding: 60px 20px;
  background-color: white;
  border-radius: 8px;
  color: #666;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.product-card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.product-image {
  position: relative;
  height: 200px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: #4CAF50;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
}

.product-info {
  padding: 16px;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.product-header h4 {
  margin: 0;
  color: #333;
  font-size: 16px;
}

.product-seller {
  color: #999;
  font-size: 12px;
  margin: 4px 0 8px 0;
}

.product-actions {
  display: flex;
  gap: 8px;
}

.edit-button,
.status-button,
.delete-button {
  padding: 4px 8px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.edit-button {
  background-color: #2196F3;
  color: white;
}

.status-button {
  background-color: #FF9800;
  color: white;
}

.delete-button {
  background-color: #f44336;
  color: white;
}

.product-description {
  color: #666;
  font-size: 14px;
  margin-bottom: 12px;
  line-height: 1.4;
}

.product-price {
  color: #f44336;
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.product-status {
  color: #4CAF50;
  font-size: 12px;
  margin: 4px 0;
}

.product-status.inactive {
  color: #f44336;
}

.product-date {
  color: #999;
  font-size: 12px;
  margin: 4px 0;
}
</style>