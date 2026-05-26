<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const products = ref([])
const isLoading = ref(true)
const total = ref(0)
const pages = ref(0)
const currentPage = ref(1)

const fetchMyProducts = async (page = 1) => {
  isLoading.value = true
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products?seller_id=${userStore.id}&page=${page}&per_page=10`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || '获取商品失败')
    }
    
    products.value = data.products
    total.value = data.total
    pages.value = data.pages
    currentPage.value = data.current_page
  } catch (error) {
    console.error('获取商品失败:', error)
    alert('获取商品失败')
  } finally {
    isLoading.value = false
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

const toggleStatus = async (productId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  
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
      alert(newStatus === 'active' ? '上架成功' : '下架成功')
    } else {
      const data = await response.json()
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('操作失败:', error)
    alert('操作失败')
  }
}

const editProduct = (productId) => {
  router.push(`/products/${productId}/edit`)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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

const getStatusLabel = (status) => {
  const labels = {
    'active': '在售',
    'inactive': '已下架',
    'sold': '已售出',
    'removed': '已移除'
  }
  return labels[status] || status
}

const getStatusColor = (status) => {
  const colors = {
    'active': '#4CAF50',
    'inactive': '#999',
    'sold': '#FF9800',
    'removed': '#f44336'
  }
  return colors[status] || '#666'
}

const changePage = (page) => {
  fetchMyProducts(page)
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchMyProducts()
  }
})
</script>

<template>
  <div class="my-products-container">
    <div class="header">
      <h1>我发布的商品</h1>
      <div class="header-actions">
        <button @click="router.push('/products/publish')" class="publish-btn">发布新商品</button>
        <button @click="router.push('/')" class="back-btn">返回首页</button>
      </div>
    </div>
    
    <div class="content">
      <div v-if="isLoading" class="loading">
        加载中...
      </div>
      
      <div v-else-if="products.length === 0" class="empty-message">
        <p>您还没有发布任何商品</p>
        <button @click="router.push('/products/publish')" class="publish-btn">发布商品</button>
      </div>
      
      <div v-else class="product-list">
        <div v-for="product in products" :key="product.id" class="product-item">
          <div class="product-image">
            <img :src="getProductImageUrl(product.image)" :alt="product.title">
          </div>
          
          <div class="product-info">
            <h3 class="product-title">{{ product.title }}</h3>
            <p class="product-price">¥{{ product.price?.toFixed(2) }}</p>
            <p class="product-category">分类：{{ product.category }}</p>
            <p class="product-date">发布时间：{{ formatDate(product.created_at) }}</p>
            <span class="product-status" :style="{ color: getStatusColor(product.status) }">
              {{ getStatusLabel(product.status) }}
            </span>
          </div>
          
          <div class="product-actions">
            <button 
              v-if="product.status === 'active'" 
              @click="toggleStatus(product.id, product.status)" 
              class="action-btn off-btn"
            >
              下架
            </button>
            <button 
              v-if="product.status === 'inactive'" 
              @click="toggleStatus(product.id, product.status)" 
              class="action-btn on-btn"
            >
              上架
            </button>
            <button 
              v-if="product.status !== 'sold' && product.status !== 'removed'" 
              @click="editProduct(product.id)" 
              class="action-btn edit-btn"
            >
              编辑
            </button>
            <button 
              @click="deleteProduct(product.id)" 
              class="action-btn delete-btn"
            >
              删除
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="pages > 1" class="pagination">
        <button 
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          上一页
        </button>
        <span>第 {{ currentPage }} / {{ pages }} 页</span>
        <button 
          :disabled="currentPage === pages"
          @click="changePage(currentPage + 1)"
        >
          下一页
        </button>
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
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  color: #333;
  margin: 0;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.publish-btn {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.publish-btn:hover {
  background-color: #45a049;
}

.back-btn {
  padding: 8px 16px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.content {
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-message {
  text-align: center;
  padding: 60px 20px;
  background-color: white;
  border-radius: 8px;
  color: #999;
}

.empty-message .publish-btn {
  margin-top: 20px;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.product-item {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 20px;
  align-items: center;
}

.product-image {
  width: 100px;
  height: 100px;
  overflow: hidden;
  border-radius: 4px;
  flex-shrink: 0;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  flex: 1;
}

.product-title {
  font-size: 18px;
  color: #333;
  margin: 0 0 10px 0;
}

.product-price {
  font-size: 16px;
  color: #f44336;
  margin: 0 0 8px 0;
}

.product-category,
.product-date {
  font-size: 14px;
  color: #666;
  margin: 0 0 5px 0;
}

.product-status {
  font-size: 14px;
  font-weight: bold;
}

.product-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  min-width: 70px;
}

.off-btn {
  background-color: #FF9800;
  color: white;
}

.off-btn:hover {
  background-color: #F57C00;
}

.on-btn {
  background-color: #4CAF50;
  color: white;
}

.on-btn:hover {
  background-color: #45a049;
}

.edit-btn {
  background-color: #2196F3;
  color: white;
}

.edit-btn:hover {
  background-color: #1976D2;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
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