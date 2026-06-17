<script setup>
import { useUserStore } from '../stores/user.js'
import { useProductStore } from '../stores/product.js'
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import NotificationBell from '../components/NotificationBell.vue'

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

const handleMyOrders = () => {
  router.push('/my-orders')
  isDropdownOpen.value = false
}

const handleChat = () => {
  router.push('/chat')
  isDropdownOpen.value = false
}

const handleAdminProducts = () => {
  router.push('/admin/products')
  isDropdownOpen.value = false
}

const handleDeleteProduct = async (productId) => {
  if (!confirm('确定要删除这个商品吗？')) {
    return
  }

  try {
    let url = `http://127.0.0.1:5000/api/products/${productId}`
    if (userStore.isAdmin) {
      url = `http://127.0.0.1:5000/api/admin/products/${productId}`
    }
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      productStore.products = productStore.products.filter(p => p.id !== productId)
      alert('商品删除成功！')
    } else {
      const data = await response.json()
      alert(data.error || '删除失败')
    }
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败')
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

const handleMarkSold = async (productId) => {
  if (!confirm('确定要标记此商品为已售出吗？')) {
    return
  }
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/admin/products/${productId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ status: 'sold' })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      const product = productStore.products.find(p => p.id === productId)
      if (product) {
        product.status = 'sold'
      }
      alert('标记已售出成功')
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('操作失败:', error)
    alert('操作失败')
  }
}

const handleViewDetail = (id) => {
  router.push(`/products/${id}`)
}

const handleContactSeller = async (product) => {
  if (!userStore.token) return

  try {
    const response = await fetch('http://127.0.0.1:5000/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        seller_id: product.seller_id,
        product_id: product.id
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '创建会话失败')
    }

    router.push(`/chat/${data.conversation.id}`)
  } catch (error) {
    alert(error.message || '创建会话失败，请重试')
  }
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
    console.error('筛选商品失败', error)
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
    console.error('初始化失败', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        校园二手交易平台
      </h1>
      <div class="header-actions">
        <template v-if="userStore.isLoggedIn">
          <div class="user-info">
            <img :src="getAvatarUrl()" :alt="userStore.nickname" class="user-avatar">
            <span>{{ userStore.nickname }}</span>
          </div>
          <NotificationBell />
          <div class="dropdown">
            <button @click="toggleDropdown" class="dropdown-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              菜单
            </button>
            <div v-if="isDropdownOpen" class="dropdown-menu">
              <button @click="handleProfile" class="dropdown-item profile-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                个人信息
              </button>
              <button @click="router.push('/notifications')" class="dropdown-item notification-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                消息通知
              </button>
              <button @click="router.push('/reports')" class="dropdown-item report-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                我的举报
              </button>
              <button @click="handleMyProducts" class="dropdown-item my-products-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
                我发布的
              </button>
              <button @click="handleMyOrders" class="dropdown-item my-orders-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>
                我的订单
              </button>
              <button @click="handleChat" class="dropdown-item chat-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                我的消息
              </button>
              <button @click="handlePublish" class="dropdown-item publish-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                发布商品
              </button>
              <button v-if="userStore.isAdmin" @click="handleAdminProducts" class="dropdown-item admin-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                商品管理
              </button>
              <div class="dropdown-divider"></div>
              <button @click="handleLogout" class="dropdown-item logout-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                退出登录
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <button @click="router.push('/login')" class="login-button">开始探索</button>
        </template>
      </div>
    </div>
    
    <div class="content">
      <div class="hero-section">
        <h2>发现校园好物</h2>
        <p>买卖二手物品，让闲置焕发新生</p>
        <div v-if="userStore.isLoggedIn" class="admin-indicator">
          <span>用户ID: {{ userStore.id }}</span>
          <span>管理员: {{ userStore.isAdmin ? '是' : '否' }}</span>
        </div>
      </div>
      
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
          ★我的收藏
        </button>
      </div>
      
      <div class="products-section">
        <h3>商品列表</h3>
        <div v-if="isLoading" class="loading">
          <p>加载中...</p>
        </div>
        <div v-else-if="productStore.products.length === 0" class="no-products">
          <div class="no-products-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="1.5" opacity="0.4"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <p>暂无商品，快去发布或探索吧！</p>
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
                ★
              </button>
            </div>
            <div class="product-info">
              <div class="product-header">
                <h4 @click="handleViewDetail(product.id)">{{ product.title }}</h4>
                <div class="product-actions">
                  <button v-if="userStore.isLoggedIn && (product.seller_id === userStore.id || userStore.isAdmin)" @click.stop="handleEditProduct(product.id)" class="edit-button">修改</button>
                  <button v-if="userStore.isLoggedIn && (product.seller_id === userStore.id || userStore.isAdmin)" @click.stop="handleToggleProductStatus(product.id)" class="status-button">{{ product.status === 'active' ? '下架' : '上架' }}</button>
                  <button v-if="userStore.isLoggedIn && (product.seller_id === userStore.id || userStore.isAdmin) && product.status !== 'sold'" @click.stop="handleMarkSold(product.id)" class="mark-sold-button">标记售出</button>
                  <button v-if="userStore.isLoggedIn && (product.seller_id === userStore.id || userStore.isAdmin)" @click.stop="handleDeleteProduct(product.id)" class="delete-button">删除</button>
                </div>
              </div>
              <p class="product-seller">卖家：{{ product.seller?.nickname || '匿名' }}</p>
              <p class="product-description">{{ product.description }}</p>
              <p class="product-price">{{ product.price?.toFixed(2) }}</p>
              <button
                v-if="userStore.isLoggedIn && userStore.id !== product.seller_id"
                @click.stop="handleContactSeller(product)"
                class="contact-seller-btn"
              >
                联系卖家
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 设计系统：活力块状风格 ===== */
/* 主色：#7C3AED（紫色） | CTA：#22C55E（绿色） | 背景：#FAF5FF */

.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}

/* ===== 导航栏 ===== */
.header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 16px 40px;
  box-shadow: 0 1px 3px rgba(124, 58, 237, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(124, 58, 237, 0.1);
}

.header h1 {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 22px;
  margin: 0;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #FAF5FF;
  padding: 4px 14px 4px 4px;
  border-radius: 24px;
  border: 1px solid rgba(124, 58, 237, 0.15);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #A78BFA;
}

.header-actions span {
  color: #4C1D95;
  font-size: 14px;
  font-weight: 500;
}

.login-button {
  padding: 10px 28px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
}

.login-button:active {
  transform: translateY(0);
}

/* ===== 下拉菜单 ===== */
.dropdown {
  position: relative;
}

.dropdown-button {
  padding: 8px 18px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
}

.dropdown-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: white;
  border-radius: 14px;
  box-shadow: 0 10px 40px rgba(124, 58, 237, 0.15), 0 2px 10px rgba(0, 0, 0, 0.06);
  padding: 6px;
  min-width: 150px;
  z-index: 100;
  animation: dropdownFadeIn 0.2s ease;
  border: 1px solid rgba(124, 58, 237, 0.08);
}

@keyframes dropdownFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  border-radius: 10px;
  transition: all 0.2s ease;
  font-weight: 500;
}

.dropdown-item:hover {
  background: #FAF5FF;
  transform: translateX(3px);
}

.dropdown-item svg {
  width: 16px;
  height: 16px;
  margin-right: 10px;
  vertical-align: middle;
  flex-shrink: 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown-divider {
  height: 1px;
  background: #EDE9FE;
  margin: 4px 10px;
}

.profile-item { color: #7C3AED; }
.my-products-item { color: #7C3AED; }
.chat-item { color: #7C3AED; }
.publish-item { color: #22C55E; }
.notification-item { color: #7C3AED; }
.report-item { color: #EF4444; }
.admin-item { color: #F59E0B; }
.logout-item { color: #EF4444; }

/* ===== 内容区 ===== */
.content {
  padding: 32px 40px 60px;
  max-width: 1200px;
  margin: 0 auto;
}

.hero-section {
  margin-bottom: 28px;
}

.hero-section h2 {
  color: #4C1D95;
  font-size: 32px;
  font-weight: 800;
  margin: 0 0 6px;
  letter-spacing: -0.5px;
}

.hero-section p {
  color: #7C3AED;
  opacity: 0.7;
  font-size: 16px;
  margin: 0;
}

.admin-indicator {
  display: flex;
  gap: 20px;
  margin-top: 10px;
  font-size: 12px;
  color: #6B7280;
  background: #FAF5FF;
  padding: 8px 16px;
  border-radius: 8px;
  display: inline-flex;
}

.admin-indicator span {
  padding: 2px 8px;
  background: white;
  border-radius: 4px;
}

/* ===== 搜索区（Hero 风格） ===== */
.search-section {
  background: white;
  padding: 24px 28px;
  border-radius: 18px;
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
  display: flex;
  gap: 16px;
  margin-bottom: 28px;
  align-items: center;
  flex-wrap: wrap;
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.search-bar {
  flex: 1;
  display: flex;
  gap: 10px;
  min-width: 250px;
}

.search-input {
  flex: 1;
  padding: 12px 18px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 14px;
  background: #FAF5FF;
  transition: all 0.25s ease;
  outline: none;
}

.search-input:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

.search-button {
  padding: 12px 28px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.search-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
}

.category-filter,
.sort-filter {
  min-width: 140px;
}

.category-select,
.sort-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 14px;
  background: #FAF5FF;
  cursor: pointer;
  outline: none;
  transition: all 0.25s ease;
  color: #4C1D95;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%237C3AED' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.category-select:focus,
.sort-select:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background-color: white;
}

.favorites-button {
  padding: 12px 22px;
  border: 2px solid #FCA5A5;
  border-radius: 12px;
  background: white;
  color: #EF4444;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
}

.favorites-button:hover {
  background: #FEF2F2;
  border-color: #EF4444;
  transform: translateY(-1px);
}

.favorites-button.active {
  background: #EF4444;
  color: white;
  border-color: #EF4444;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3);
}

/* ===== 商品列表 ===== */
.products-section h3 {
  color: #4C1D95;
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
}

.loading {
  text-align: center;
  padding: 80px 20px;
  color: #7C3AED;
  font-size: 16px;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-products {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 18px;
  color: #7C3AED;
  opacity: 0.6;
  font-size: 15px;
  border: 2px dashed #EDE9FE;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 24px;
}

.product-card {
  background: white;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(124, 58, 237, 0.12);
  border-color: rgba(124, 58, 237, 0.15);
}

.product-image {
  position: relative;
  height: 200px;
  overflow: hidden;
  background: linear-gradient(135deg, #FAF5FF, #EDE9FE);
  cursor: pointer;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.category-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
}

.favorite-button {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  color: #D1D5DB;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.favorite-button:hover {
  background: #FEE2E2;
  color: #EF4444;
  transform: scale(1.1);
}

.favorite-button.favorited {
  background: #EF4444;
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);
}

.product-info {
  padding: 18px;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
  gap: 8px;
}

.product-header h4 {
  margin: 0;
  color: #1F2937;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  line-height: 1.3;
  transition: color 0.2s;
  flex: 1;
}

.product-header h4:hover {
  color: #7C3AED;
}

.product-seller {
  color: #8B5CF6;
  font-size: 12px;
  margin: 2px 0 8px 0;
  font-weight: 500;
}

.product-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.edit-button,
.status-button,
.delete-button {
  padding: 5px 10px;
  font-size: 11px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.edit-button {
  background: #EDE9FE;
  color: #7C3AED;
}

.edit-button:hover {
  background: #7C3AED;
  color: white;
}

.status-button {
  background: #FEF3C7;
  color: #D97706;
}

.status-button:hover {
  background: #D97706;
  color: white;
}

.mark-sold-button {
  background: #DBEAFE;
  color: #2563EB;
}

.mark-sold-button:hover {
  background: #2563EB;
  color: white;
}

.delete-button {
  background: #FEE2E2;
  color: #EF4444;
}

.delete-button:hover {
  background: #EF4444;
  color: white;
}

.admin-action {
  border: 1px dashed #F59E0B;
}

.product-description {
  color: #6B7280;
  font-size: 13px;
  margin-bottom: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price {
  color: #7C3AED;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.product-price::before {
  content: '¥';
  font-size: 14px;
}

.contact-seller-btn {
  width: 100%;
  margin-top: 14px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25);
}

.contact-seller-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35);
}

.contact-seller-btn:active {
  transform: translateY(0);
}

.contact-seller-btn:hover {
  background-color: #F57C00;
}
</style>