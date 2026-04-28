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
  router.push('/publish')
  isDropdownOpen.value = false
}

const handleDeleteProduct = (id) => {
  if (confirm('确定要删除这个商品吗？')) {
    const success = productStore.deleteProduct(id)
    if (success) {
      alert('商品删除成功！')
    } else {
      alert('删除失败，请重试')
    }
  }
}

const handleEditProduct = (id) => {
  // 这里可以实现跳转到编辑页面的逻辑
  alert('编辑商品功能开发中...')
}

const handleToggleProductStatus = (id) => {
  const success = productStore.toggleProductStatus(id)
  if (success) {
    alert('商品状态更新成功！')
  } else {
    alert('更新失败，请重试')
  }
}

onMounted(() => {
  console.log('商品列表:', productStore.products)
})
</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1>二手校园交易平台</h1>
      <div class="header-actions">
        <span>欢迎，{{ userStore.username }}</span>
        <div class="dropdown">
          <button @click="toggleDropdown" class="dropdown-button">菜单</button>
          <div v-if="isDropdownOpen" class="dropdown-menu">
            <button @click="handlePublish" class="dropdown-item publish-item">发布商品</button>
            <button @click="handleLogout" class="dropdown-item logout-item">退出登录</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="content">
      <h2>首页</h2>
      <p>这里是二手校园交易平台的首页，您可以在这里浏览和发布二手商品。</p>
      
      <div class="products-section">
        <h3>商品列表</h3>
        <div v-if="productStore.products.length === 0" class="no-products">
          <p>暂无商品，快去发布第一个商品吧！</p>
        </div>
        <div v-else class="products-grid">
          <div v-for="product in productStore.products" :key="product.id" class="product-card">
            <div class="product-image" v-if="product.image">
              <img :src="product.image" :alt="product.name">
            </div>
            <div class="product-info">
              <div class="product-header">
                <h4>{{ product.name }}</h4>
                <div class="product-actions">
                  <button v-if="userStore.isAdmin || product.publisher === userStore.username" @click="handleEditProduct(product.id)" class="edit-button">修改</button>
                  <button v-if="userStore.isAdmin || product.publisher === userStore.username" @click="handleToggleProductStatus(product.id)" class="status-button">{{ product.isActive ? '下架' : '上架' }}</button>
                  <button v-if="userStore.isAdmin" @click="handleDeleteProduct(product.id)" class="delete-button">删除</button>
                </div>
              </div>
              <p class="product-description">{{ product.description }}</p>
              <p class="product-price">¥{{ product.price.toFixed(2) }}</p>
              <p class="product-status" :class="{ 'inactive': !product.isActive }">{{ product.isActive ? '上架' : '下架' }}</p>
              <p class="product-date">{{ new Date(product.createdAt).toLocaleString() }}</p>
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
  transition: background-color 0.3s;
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
  transition: background-color 0.3s;
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

.publish-item:hover {
  background-color: #e8f5e8;
}

.logout-item:hover {
  background-color: #ffe8e8;
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
  margin-bottom: 20px;
}

.content p {
  color: #666;
  font-size: 16px;
  line-height: 1.5;
}

.products-section {
  margin-top: 40px;
}

.products-section h3 {
  color: #333;
  margin-bottom: 20px;
  font-size: 20px;
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
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.product-card {
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.product-image {
  height: 200px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.product-info {
  padding: 15px;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.product-header h4 {
  color: #333;
  margin: 0;
  font-size: 16px;
  font-weight: bold;
}

.product-actions {
  display: flex;
  gap: 5px;
  align-items: center;
}

.edit-button {
  padding: 4px 8px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.edit-button:hover {
  background-color: #1976D2;
}

.status-button {
  padding: 4px 8px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.status-button:hover {
  background-color: #F57C00;
}

.delete-button {
  padding: 4px 8px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.delete-button:hover {
  background-color: #d32f2f;
}

.product-status {
  color: #4CAF50;
  font-size: 14px;
  font-weight: bold;
  margin: 5px 0;
}

.product-status.inactive {
  color: #f44336;
}

.product-description {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
  margin: 0 0 10px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-price {
  color: #f44336;
  font-size: 18px;
  font-weight: bold;
  margin: 0 0 5px 0;
}

.product-date {
  color: #999;
  font-size: 12px;
  margin: 0;
}
</style>