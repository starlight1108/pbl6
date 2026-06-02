<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useOrderStore } from '../stores/order.js'

const router = useRouter()
const userStore = useUserStore()
const orderStore = useOrderStore()

const isLoading = ref(true)
const activeTab = ref('buy') // 'buy' | 'sell'

const fetchOrders = async () => {
  isLoading.value = true
  try {
    await orderStore.fetchOrders(activeTab.value)
  } catch (error) {
    console.error('获取订单列表失败:', error)
    alert('获取订单列表失败')
  } finally {
    isLoading.value = false
  }
}

const handleTabChange = (tab) => {
  activeTab.value = tab
  fetchOrders()
}

const goToOrderDetail = (orderId) => {
  router.push(`/my-orders/${orderId}`)
}

const getStatusText = (status) => {
  const map = {
    'pending': '待确认',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return map[status] || status
}

const getStatusClass = (status) => {
  const map = {
    'pending': 'status-pending',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
  }
  return map[status] || ''
}

const getImageUrl = (path) => {
  const baseUrl = 'http://127.0.0.1:5000'
  if (!path) return baseUrl + '/static/images/default-product.png'
  return path.startsWith('/') ? baseUrl + path : baseUrl + '/' + path
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

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  fetchOrders()
})
</script>

<template>
  <div class="my-orders-container">
    <div class="header">
      <button @click="goBack" class="back-button">← 返回</button>
      <h1>我的订单</h1>
      <div class="placeholder"></div>
    </div>

    <div class="tabs">
      <button
        @click="handleTabChange('buy')"
        :class="['tab', activeTab === 'buy' ? 'active' : '']"
      >
        我购买的
      </button>
      <button
        @click="handleTabChange('sell')"
        :class="['tab', activeTab === 'sell' ? 'active' : '']"
      >
        我卖出的
      </button>
    </div>

    <div v-if="isLoading" class="loading">
      加载中...
    </div>

    <div v-else-if="orderStore.orders.length === 0" class="empty-state">
      <p>{{ activeTab === 'buy' ? '暂无购买记录' : '暂无卖出记录' }}</p>
      <button v-if="activeTab === 'buy'" @click="router.push('/')" class="browse-btn">去逛逛</button>
    </div>

    <div v-else class="orders-list">
      <div
        v-for="order in orderStore.orders"
        :key="order.id"
        class="order-card"
        @click="goToOrderDetail(order.id)"
      >
        <div class="order-header">
          <span class="order-id">订单 #{{ order.id }}</span>
          <span :class="['status-badge', getStatusClass(order.status)]">
            {{ getStatusText(order.status) }}
          </span>
        </div>
        <div class="order-body">
          <div class="product-image-wrapper">
            <img :src="getImageUrl(order.product?.image)" :alt="order.product?.title" class="product-image">
          </div>
          <div class="order-info">
            <h3 class="product-title">{{ order.product?.title || '商品已下架' }}</h3>
            <p class="other-user">
              <template v-if="activeTab === 'buy'">
                卖家：{{ order.seller?.nickname || '未知' }}
              </template>
              <template v-else>
                买家：{{ order.buyer?.nickname || '未知' }}
              </template>
            </p>
            <p class="order-time">{{ formatDate(order.created_at) }}</p>
          </div>
          <div class="order-price">
            <span class="price-label">成交价</span>
            <span class="price-value">¥{{ order.final_price?.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div v-if="orderStore.pages > 1" class="pagination">
        <button
          :disabled="orderStore.currentPage === 1"
          @click="fetchOrders()"
          class="page-btn"
        >
          上一页
        </button>
        <span class="page-info">{{ orderStore.currentPage }} / {{ orderStore.pages }}</span>
        <button
          :disabled="orderStore.currentPage === orderStore.pages"
          @click="fetchOrders()"
          class="page-btn"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-orders-container {
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

.browse-btn {
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

.browse-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4);
}

.orders-list {
  max-width: 800px;
  margin: 20px auto;
  padding: 0 20px 60px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.06);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(124, 58, 237, 0.06);
  overflow: hidden;
}

.order-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.12);
  border-color: rgba(124, 58, 237, 0.15);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: #FAF5FF;
  border-bottom: 1px solid rgba(124, 58, 237, 0.06);
}

.order-id {
  font-size: 13px;
  color: #8B5CF6;
  font-weight: 500;
}

.status-badge {
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-pending {
  background: #FEF3C7;
  color: #D97706;
}

.status-completed {
  background: #DCFCE7;
  color: #22C55E;
}

.status-cancelled {
  background: #FEE2E2;
  color: #EF4444;
}

.order-body {
  display: flex;
  gap: 14px;
  padding: 14px 18px;
  align-items: center;
}

.product-image-wrapper {
  width: 70px;
  height: 70px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #FAF5FF, #EDE9FE);
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.product-title {
  color: #1F2937;
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.other-user {
  color: #8B5CF6;
  font-size: 13px;
  margin: 0 0 2px 0;
}

.order-time {
  color: #A78BFA;
  font-size: 12px;
  margin: 0;
}

.order-price {
  text-align: right;
  flex-shrink: 0;
}

.price-label {
  display: block;
  font-size: 11px;
  color: #9CA3AF;
  margin-bottom: 2px;
}

.price-value {
  font-size: 18px;
  font-weight: 700;
  color: #7C3AED;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
}

.page-btn {
  padding: 8px 20px;
  background: white;
  border: 2px solid #EDE9FE;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #7C3AED;
  cursor: pointer;
  transition: all 0.25s ease;
}

.page-btn:hover:not(:disabled) {
  background: #7C3AED;
  color: white;
  border-color: #7C3AED;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #8B5CF6;
  font-weight: 500;
}
</style>
