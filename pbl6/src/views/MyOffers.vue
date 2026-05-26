<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOfferStore } from '../stores/offer.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const offerStore = useOfferStore()
const userStore = useUserStore()

const filter = ref('all')
const isLoading = ref(false)

const filteredOffers = computed(() => {
  if (filter.value === 'all') {
    return offerStore.myOffers
  }
  return offerStore.myOffers.filter(o => o.status === filter.value)
})

const getStatusLabel = (status) => {
  const labels = {
    'pending': '待处理',
    'accepted': '已接受',
    'rejected': '已拒绝'
  }
  return labels[status] || status
}

const getStatusColor = (status) => {
  const colors = {
    'pending': '#FF9800',
    'accepted': '#4CAF50',
    'rejected': '#f44336'
  }
  return colors[status] || '#666'
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const goToProduct = (productId) => {
  router.push(`/products/${productId}`)
}

const changePage = async (page) => {
  isLoading.value = true
  try {
    await offerStore.fetchMyOffers(page)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    isLoading.value = true
    try {
      await offerStore.fetchMyOffers()
    } finally {
      isLoading.value = false
    }
  }
})
</script>

<template>
  <div class="my-offers-container">
    <div class="header">
      <h1>我的报价</h1>
      <button @click="router.push('/')" class="back-btn">返回首页</button>
    </div>
    
    <div class="content">
      <div class="filter-bar">
        <button 
          :class="['filter-btn', { active: filter === 'all' }]" 
          @click="filter = 'all'"
        >
          全部
        </button>
        <button 
          :class="['filter-btn', { active: filter === 'pending' }]" 
          @click="filter = 'pending'"
        >
          待处理
        </button>
        <button 
          :class="['filter-btn', { active: filter === 'accepted' }]" 
          @click="filter = 'accepted'"
        >
          已接受
        </button>
        <button 
          :class="['filter-btn', { active: filter === 'rejected' }]" 
          @click="filter = 'rejected'"
        >
          已拒绝
        </button>
      </div>
      
      <div v-if="isLoading" class="loading">
        加载中...
      </div>
      
      <div v-else-if="filteredOffers.length === 0" class="empty-message">
        <p>暂无报价记录</p>
      </div>
      
      <div v-else class="offer-list">
        <div 
          v-for="offer in filteredOffers" 
          :key="offer.id" 
          class="offer-item"
        >
          <div class="offer-header">
            <span class="offer-status" :style="{ color: getStatusColor(offer.status) }">
              {{ getStatusLabel(offer.status) }}
            </span>
            <span class="offer-time">{{ formatTime(offer.created_at) }}</span>
          </div>
          
          <div class="offer-product">
            <div class="product-info">
              <h3 class="product-title">{{ offer.product?.title || '商品已删除' }}</h3>
              <div class="price-comparison">
                <span class="original-price">原价：¥{{ offer.original_price?.toFixed(2) }}</span>
                <span class="offered-price">报价：¥{{ offer.offered_price?.toFixed(2) }}</span>
              </div>
            </div>
            <button 
              v-if="offer.product" 
              @click="goToProduct(offer.product_id)" 
              class="view-product-btn"
            >
              查看商品
            </button>
          </div>
          
          <div v-if="offer.message" class="offer-message">
            <span class="message-label">留言：</span>
            <p class="message-text">{{ offer.message }}</p>
          </div>
        </div>
      </div>
      
      <div v-if="offerStore.pages > 1" class="pagination">
        <button 
          :disabled="offerStore.currentPage === 1"
          @click="changePage(offerStore.currentPage - 1)"
        >
          上一页
        </button>
        <span>第 {{ offerStore.currentPage }} / {{ offerStore.pages }} 页</span>
        <button 
          :disabled="offerStore.currentPage === offerStore.pages"
          @click="changePage(offerStore.currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-offers-container {
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
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
}

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.filter-btn {
  padding: 8px 16px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.filter-btn.active {
  background-color: #FF9800;
  color: white;
  border-color: #FF9800;
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

.offer-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.offer-item {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.offer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.offer-status {
  font-size: 14px;
  font-weight: bold;
}

.offer-time {
  font-size: 12px;
  color: #999;
}

.offer-product {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 15px;
}

.product-info {
  flex: 1;
}

.product-title {
  font-size: 16px;
  color: #333;
  margin: 0 0 10px 0;
}

.price-comparison {
  display: flex;
  gap: 20px;
}

.original-price {
  font-size: 14px;
  color: #999;
}

.offered-price {
  font-size: 14px;
  color: #FF9800;
  font-weight: bold;
}

.view-product-btn {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.view-product-btn:hover {
  background-color: #45a049;
}

.offer-message {
  padding: 10px;
  background-color: #FFF3E0;
  border-radius: 4px;
  border-left: 3px solid #FF9800;
}

.message-label {
  font-size: 14px;
  color: #666;
}

.message-text {
  font-size: 14px;
  color: #333;
  margin: 5px 0 0 0;
  line-height: 1.5;
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
  background-color: #FF9800;
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