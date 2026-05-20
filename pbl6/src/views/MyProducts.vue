<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const products = ref([])
const isLoading = ref(true)
const activeTab = ref('active')

const fetchMyProducts = async () => {
  isLoading.value = true
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products?seller_id=${userStore.userId}&status=${activeTab.value}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()
    if (data.products) {
      products.value = data.products
    }
  } catch (error) {
    console.error('获取我的商品失败:', error)
    alert('获取我的商品失败')
  } finally {
    isLoading.value = false
  }
}

const handleStatusChange = (status) => {
  activeTab.value = status
  fetchMyProducts()
}

const goToProductDetail = (productId) => {
  router.push(`/products/${productId}`)
}

const editProduct = (productId) => {
  router.push(`/products/edit/${productId}`)
}

const toggleProductStatus = async (productId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  const actionText = newStatus === 'inactive' ? '下架' : '上架'

  if (!confirm(`确定要${actionText}这个商品吗？`)) {
    return
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ status: newStatus })
    })

    if (response.ok) {
      const product = products.value.find(p => p.id === productId)
      if (product) {
        product.status = newStatus
      }
      alert(`${actionText}成功`)
    } else {
      const data = await response.json()
      alert(data.error || `${actionText}失败`)
    }
  } catch (error) {
    console.error(`${actionText}商品失败:`, error)
    alert(`${actionText}商品失败`)
  }
}

const deleteProduct = async (productId) => {
  if (!confirm('确定要删除这个商品吗？')) {
    return
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      products.value = products.value.filter(p => p.id !== productId)
      alert('删除成功')
    } else {
      const data = await response.json()
      alert(data.error || '删除失败')
    }
  } catch (error) {
    console.error('删除商品失败:', error)
    alert('删除商品失败')
  }
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  fetchMyProducts()
})
</script>

<template>
  <div class="my-products-container">
    <div class="header">
      <button @click="goBack" class="back-button">← 返回</button>
      <h1>我发布的商品</h1>
      <div class="placeholder"></div>
    </div>

    <div class="tabs">
      <button 
        @click="handleStatusChange('active')" 
        :class="['tab', activeTab === 'active' ? 'active' : '']"
      >
        在售商品 ({{ products.filter(p => p.status === 'active').length }})
      </button>
      <button 
        @click="handleStatusChange('inactive')" 
        :class="['tab', activeTab === 'inactive' ? 'active' : '']"
      >
        已下架 ({{ products.filter(p => p.status === 'inactive').length }})
      </button>
    </div>

    <div v-if="isLoading" class="loading">
      加载中...
    </div>

    <div v-else-if="products.length === 0" class="empty-state">
      <p>{{ activeTab === 'active' ? '暂无在售商品' : '暂无已下架商品' }}</p>
      <button v-if="activeTab === 'active'" @click="router.push('/products/publish')" class="publish-btn">发布商品</button>
    </div>

    <div v-else class="products-grid">
      <div v-for="product in products" :key="product.id" class="product-card">
        <div class="product-image-wrapper" @click="goToProductDetail(product.id)">
          <img :src="'http://127.0.0.1:5000' + product.image" :alt="product.title" class="product-image">
          <span v-if="product.status !== 'active'" class="status-badge">已下架</span>
        </div>
        <div class="product-info">
          <h3 @click="goToProductDetail(product.id)" class="product-title">{{ product.title }}</h3>
          <p class="product-price">¥{{ product.price.toFixed(2) }}</p>
          <p class="product-meta">
            <span>{{ product.category }}</span>
            <span>{{ formatDate(product.created_at) }}</span>
          </p>
          <p class="comment-count">评论数：{{ product.comment_count }}</p>
        </div>
        <div class="product-actions">
          <button @click="editProduct(product.id)" class="action-btn edit-btn">编辑</button>
          <button 
            @click="deleteProduct(product.id)" 
            class="action-btn delete-btn"
          >
            删除
          </button>
          <button 
            v-if="product.status === 'active'" 
            @click="toggleProductStatus(product.id, product.status)" 
            class="action-btn offline-btn"
          >
            下架
          </button>
          <button 
            v-if="product.status === 'inactive'" 
            @click="toggleProductStatus(product.id, product.status)" 
            class="action-btn online-btn"
          >
            上架
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-products-container {
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

.back-button {
  background: none;
  border: none;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  padding: 8px 16px;
}

.back-button:hover {
  color: #4CAF50;
}

.header h1 {
  color: #333;
  font-size: 20px;
  margin: 0;
}

.placeholder {
  width: 80px;
}

.tabs {
  display: flex;
  gap: 16px;
  padding: 20px 40px;
  background-color: white;
  border-bottom: 1px solid #eee;
}

.tab {
  padding: 10px 20px;
  background: none;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  background-color: #f0f0f0;
}

.tab.active {
  background-color: #4CAF50;
  color: white;
}

.loading {
  text-align: center;
  padding: 50px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-state p {
  color: #999;
  font-size: 18px;
  margin-bottom: 20px;
}

.publish-btn {
  padding: 12px 32px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.publish-btn:hover {
  background-color: #45a049;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

.product-card {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.product-image-wrapper {
  position: relative;
  height: 200px;
  overflow: hidden;
  cursor: pointer;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  background-color: #f44336;
  color: white;
  font-size: 12px;
  border-radius: 4px;
}

.product-info {
  padding: 16px;
}

.product-title {
  font-size: 16px;
  color: #333;
  margin: 0 0 8px 0;
  cursor: pointer;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-title:hover {
  color: #4CAF50;
}

.product-price {
  font-size: 20px;
  color: #f44336;
  font-weight: bold;
  margin: 0 0 8px 0;
}

.product-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #999;
  margin: 0 0 8px 0;
}

.comment-count {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.product-actions {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.edit-btn {
  background-color: #f0f0f0;
  color: #333;
}

.edit-btn:hover {
  background-color: #e0e0e0;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

.offline-btn {
  background-color: #ff9800;
  color: white;
}

.offline-btn:hover {
  background-color: #f57c00;
}

.online-btn {
  background-color: #4CAF50;
  color: white;
}

.online-btn:hover {
  background-color: #45a049;
}
</style>