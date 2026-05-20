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
const searchKeyword = ref('')
const selectedCategory = ref('')
const categories = ref([])
const favoriteStatus = ref({})
const sortBy = ref('created_at')
const sortOrder = ref('desc')
const showFavoritesOnly = ref(false)

const sortOptions = [
  { value: 'created_at', label: '最新发布' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
  { value: 'title', label: '按名称排序' }
]

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
  router.push('/products/publish')
  isDropdownOpen.value = false
}

const handleProfile = () => {
  router.push('/profile')
  isDropdownOpen.value = false
}

const handleMyProducts = () => {
  router.push('/my-products')
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
  router.push(`/products/${id}/edit`)
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

const parseSortOption = (option) => {
  if (option === 'price_asc') {
    return { sortBy: 'price', sortOrder: 'asc' }
  } else if (option === 'price_desc') {
    return { sortBy: 'price', sortOrder: 'desc' }
  } else if (option === 'title') {
    return { sortBy: 'title', sortOrder: 'asc' }
  }
  return { sortBy: 'created_at', sortOrder: 'desc' }
}

const handleSearch = async () => {
  isLoading.value = true
  try {
    const sort = parseSortOption(sortBy.value)
    await productStore.fetchProducts(1, 20, selectedCategory.value, searchKeyword.value, sort.sortBy, sort.sortOrder)
  } catch (error) {
    console.error('搜索商品失败:', error)
  } finally {
    isLoading.value = false
  }
}

const handleCategoryChange = async () => {
  isLoading.value = true
  try {
    const sort = parseSortOption(sortBy.value)
    await productStore.fetchProducts(1, 20, selectedCategory.value || null, searchKeyword.value, sort.sortBy, sort.sortOrder)
  } catch (error) {
    console.error('筛选商品失败:', error)
  } finally {
    isLoading.value = false
  }
}

const handleSortChange = async () => {
  isLoading.value = true
  try {
    const sort = parseSortOption(sortBy.value)
    await productStore.fetchProducts(1, 20, selectedCategory.value || null, searchKeyword.value, sort.sortBy, sort.sortOrder)
  } catch (error) {
    console.error('排序商品失败:', error)
  } finally {
    isLoading.value = false
  }
}

const toggleShowFavorites = async () => {
  isLoading.value = true
  try {
    if (!userStore.isLoggedIn) {
      alert('请先登录')
      router.push('/login')
      return
    }
    
    if (!userStore.token) {
      alert('登录状态失效，请重新登录')
      router.push('/login')
      return
    }
    
    showFavoritesOnly.value = !showFavoritesOnly.value
    
    if (showFavoritesOnly.value) {
      const favorites = await productStore.getFavorites(userStore.token)
      productStore.products = favorites
      productStore.total = favorites.length
      productStore.pages = 1
      
      if (favorites.length === 0) {
        alert('您还没有收藏任何商品')
      }
    } else {
      const sort = parseSortOption(sortBy.value)
      await productStore.fetchProducts(1, 20, selectedCategory.value || null, searchKeyword.value, sort.sortBy, sort.sortOrder)
    }
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    
    if (error.message === 'token_expired' || error.message.includes('expired')) {
      alert('登录已过期，请重新登录')
      userStore.logout()
      router.push('/login')
    } else if (error.message.includes('token') || error.message.includes('认证')) {
      alert('登录状态失效，请重新登录')
      userStore.logout()
      router.push('/login')
    } else {
      alert(`获取收藏失败: ${error.message}`)
    }
    
    showFavoritesOnly.value = false
  } finally {
    isLoading.value = false
  }
}

const toggleFavorite = async (productId) => {
  if (!userStore.isLoggedIn) {
    alert('请先登录')
    router.push('/login')
    return
  }

  try {
    if (favoriteStatus.value[productId]) {
      await productStore.removeFavorite(productId, userStore.token)
      favoriteStatus.value[productId] = false
      alert('已取消收藏')
    } else {
      await productStore.addFavorite(productId, userStore.token)
      favoriteStatus.value[productId] = true
      alert('收藏成功')
    }
  } catch (error) {
    console.error('操作收藏失败:', error)
    alert('操作失败，请重试')
  }
}

const loadCategories = async () => {
  try {
    const cats = await productStore.getCategories()
    categories.value = cats
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

const checkFavoriteStatus = async () => {
  if (!userStore.isLoggedIn || !userStore.token) return
  
  for (const product of productStore.products) {
    const isFavorite = await productStore.checkFavorite(product.id, userStore.token)
    favoriteStatus.value[product.id] = isFavorite
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    await Promise.all([
      productStore.fetchProducts(),
      loadCategories()
    ])
    await checkFavoriteStatus()
  } catch (error) {
    console.error('初始化失败:', error)
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
              <button @click="handleProfile" class="dropdown-item profile-item">个人信息</button>
              <button @click="handleMyProducts" class="dropdown-item my-products-item">我发布的</button>
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
      
      <div class="search-section">
        <div class="search-bar">
          <input 
            v-model="searchKeyword" 
            type="text" 
            placeholder="搜索商品..." 
            class="search-input"
            @keyup.enter="handleSearch"
          >
          <button @click="handleSearch" class="search-button">搜索</button>
        </div>
        
        <div class="category-filter">
          <select v-model="selectedCategory" @change="handleCategoryChange" class="category-select">
            <option value="">全部分类</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        
        <div class="sort-filter">
          <select v-model="sortBy" @change="handleSortChange" class="sort-select">
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>
        
        <button 
          @click="toggleShowFavorites" 
          class="favorites-button"
          :class="{ 'active': showFavoritesOnly }"
        >
          ♥ 我的收藏
        </button>
      </div>
      
      <div class="products-section">
        <h3>商品列表</h3>
        <div v-if="isLoading" class="loading">
          <p>加载中...</p>
        </div>
        <div v-else-if="productStore.products.length === 0" class="no-products">
          <p>暂无收藏商品，快去收藏心仪的商品吧！</p>
        </div>
        <div v-else class="products-grid">
          <div v-for="product in productStore.products" :key="product.id" class="product-card">
            <div class="product-image" @click="handleViewDetail(product.id)">
              <img :src="getProductImageUrl(product.image)" :alt="product.title">
              <span class="category-tag">{{ product.category }}</span>
              <button 
                v-if="userStore.isLoggedIn"
                @click.stop="toggleFavorite(product.id)" 
                class="favorite-button"
                :class="{ 'favorited': favoriteStatus[product.id] }"
              >
                ♥
              </button>
            </div>
            <div class="product-info">
              <div class="product-header">
                <h4 @click="handleViewDetail(product.id)">{{ product.title }}</h4>
                <div class="product-actions">
                  <button v-if="userStore.id && product.seller_id === userStore.id" @click.stop="handleEditProduct(product.id)" class="edit-button">修改</button>
                  <button v-if="userStore.id && product.seller_id === userStore.id" @click.stop="handleToggleProductStatus(product.id)" class="status-button">{{ product.status === 'active' ? '下架' : '上架' }}</button>
                  <button v-if="userStore.isAdmin" @click.stop="handleDeleteProduct(product.id)" class="delete-button">删除</button>
                </div>
              </div>
              <p class="product-seller">卖家：{{ product.seller?.nickname || '匿名' }}</p>
              <p class="product-description">{{ product.description }}</p>
              <p class="product-price">¥{{ product.price?.toFixed(2) }}</p>
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

.profile-item {
  color: #2196F3;
}

.my-products-item {
  color: #FF9800;
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
  margin-bottom: 20px;
}

.search-section {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  align-items: center;
}

.search-bar {
  flex: 1;
  display: flex;
  gap: 10px;
}

.search-input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.search-button {
  padding: 10px 24px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.search-button:hover {
  background-color: #45a049;
}

.category-filter {
  min-width: 150px;
}

.category-select {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
}

.sort-filter {
  min-width: 150px;
}

.sort-select {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
}

.favorites-button {
  padding: 10px 20px;
  border: 1px solid #ff6b6b;
  border-radius: 4px;
  background-color: white;
  color: #ff6b6b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.favorites-button:hover {
  background-color: #ffebee;
}

.favorites-button.active {
  background-color: #ff6b6b;
  color: white;
}

.products-section h3 {
  color: #333;
  margin-bottom: 20px;
}

.loading, .no-products {
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
  cursor: pointer;
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
  cursor: pointer;
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

.favorite-button {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  color: #999;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.favorite-button:hover {
  background-color: rgba(244, 67, 54, 0.9);
  color: white;
}

.favorite-button.favorited {
  background-color: #f44336;
  color: white;
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
  cursor: pointer;
}

.product-header h4:hover {
  color: #4CAF50;
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
</style>