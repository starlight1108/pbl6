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
          <p class="product-price">{{ product.price.toFixed(2) }}</p>
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
  background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
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

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}

.back-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
}

.header h1 {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 22px;
  font-weight: 700;
  margin: 0;
}

.placeholder {
  width: 100px;
}

.tabs {
  display: flex;
  gap: 12px;
  padding: 20px 40px;
  background: white;
  border-bottom: 1px solid rgba(124, 58, 237, 0.08);
}

.tab {
  padding: 10px 24px;
  background: #FAF5FF;
  border: 2px solid transparent;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #7C3AED;
  cursor: pointer;
  transition: all 0.25s ease;
}

.tab:hover {
  background: #EDE9FE;
  border-color: rgba(124, 58, 237, 0.2);
}

.tab.active {
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
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

.empty-state {
  text-align: center;
  padding: 100px 20px;
}

.empty-state p {
  color: #7C3AED;
  opacity: 0.6;
  font-size: 18px;
  margin-bottom: 24px;
}

.publish-btn {
  padding: 14px 36px;
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.3);
}

.publish-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 24px;
  padding: 24px 40px 60px;
  max-width: 1400px;
  margin: 0 auto;
}

.product-card {
  background: white;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(124, 58, 237, 0.12);
}

.product-image-wrapper {
  position: relative;
  height: 200px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(135deg, #FAF5FF, #EDE9FE);
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  background: linear-gradient(135deg, #EF4444, #DC2626);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.product-info {
  padding: 18px;
}

.product-title {
  font-size: 16px;
  color: #1F2937;
  margin: 0 0 8px 0;
  cursor: pointer;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  display: box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s;
}

.product-title:hover {
  color: #7C3AED;
}

.product-price {
  font-size: 20px;
  color: #7C3AED;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.product-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #8B5CF6;
  opacity: 0.7;
  margin: 0 0 4px 0;
}

.comment-count {
  font-size: 12px;
  color: #8B5CF6;
  opacity: 0.6;
  margin: 0 0 12px;
}

.product-actions {
  display: flex;
  gap: 8px;
  padding: 0 18px 18px;
}

.action-btn {
  flex: 1;
  padding: 9px 12px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn {
  background: #EDE9FE;
  color: #7C3AED;
}

.edit-btn:hover {
  background: #7C3AED;
  color: white;
}

.delete-btn {
  background: #FEE2E2;
  color: #EF4444;
}

.delete-btn:hover {
  background: #EF4444;
  color: white;
}

.offline-btn {
  background: #FEF3C7;
  color: #D97706;
}

.offline-btn:hover {
  background: #D97706;
  color: white;
}

.online-btn {
  background: #DCFCE7;
  color: #22C55E;
}

.online-btn:hover {
  background: #22C55E;
  color: white;
}
</style>