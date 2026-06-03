<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useOrderStore } from '../stores/order.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const orderStore = useOrderStore()

const isLoading = ref(true)
const isProcessing = ref(false)

const fetchOrderDetail = async () => {
  isLoading.value = true
  try {
    await orderStore.fetchOrderDetail(route.params.id)
  } catch (error) {
    console.error('获取订单详情失败:', error)
    alert('获取订单详情失败')
    router.push('/my-orders')
  } finally {
    isLoading.value = false
  }
}

const order = () => orderStore.currentOrder

const isBuyer = () => {
  return order() && userStore.userId && order().buyer_id === userStore.userId
}

const isSeller = () => {
  return order() && userStore.userId && order().seller_id === userStore.userId
}

const canComplete = () => {
  return order() && order().status === 'pending' && isBuyer()
}

const canCancel = () => {
  return order() && order().status === 'pending'
}

const handleComplete = async () => {
  if (!confirm('确定要确认完成此订单吗？')) return

  isProcessing.value = true
  try {
    await orderStore.completeOrder(order().id)
    alert('订单已完成！')
  } catch (error) {
    alert(error.message || '确认完成失败')
  } finally {
    isProcessing.value = false
  }
}

const handleCancel = async () => {
  if (!confirm('确定要取消此订单吗？')) return

  isProcessing.value = true
  try {
    await orderStore.cancelOrder(order().id)
    alert('订单已取消')
  } catch (error) {
    alert(error.message || '取消订单失败')
  } finally {
    isProcessing.value = false
  }
}

const handleContact = () => {
  if (!order()) return
  // 跳转到聊天（此处简化，实际需根据 product_id 找到对应 conversation）
  router.push('/chat')
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

const getAvatarUrl = (path) => {
  const baseUrl = 'http://127.0.0.1:5000'
  const defaultAvatar = '/static/images/default-avatar.png'
  return path?.startsWith('/') ? baseUrl + path : baseUrl + defaultAvatar
}

const formatDate = (dateString) => {
  if (!dateString) return ''
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
  router.push('/my-orders')
}

onMounted(() => {
  fetchOrderDetail()
})
</script>

<template>
  <div class="order-detail-container">
    <div class="header">
      <button @click="goBack" class="back-button">← 返回</button>
      <h1>订单详情</h1>
      <div class="placeholder"></div>
    </div>

    <div v-if="isLoading" class="loading">
      加载中...
    </div>

    <div v-else-if="order()" class="content">
      <!-- 状态卡片 -->
      <div class="status-card">
        <div class="status-row">
          <span class="status-label">订单状态</span>
          <span :class="['status-badge-lg', getStatusClass(order().status)]">
            {{ getStatusText(order().status) }}
          </span>
        </div>
        <p class="order-number">订单编号：#{{ order().id }}</p>
        <p class="order-date">创建时间：{{ formatDate(order().created_at) }}</p>
      </div>

      <!-- 商品信息 -->
      <div class="section">
        <h3>商品信息</h3>
        <div class="product-card" @click="router.push(`/products/${order().product_id}`)">
          <div class="product-image-wrapper">
            <img :src="getImageUrl(order().product?.image)" :alt="order().product?.title" class="product-image">
          </div>
          <div class="product-info">
            <h4>{{ order().product?.title || '商品已下架' }}</h4>
            <p class="product-price">¥{{ order().product?.price?.toFixed(2) }}</p>
          </div>
          <span class="arrow">›</span>
        </div>
      </div>

      <!-- 成交价格 -->
      <div class="section price-section">
        <h3>交易信息</h3>
        <div class="price-row">
          <span>成交价格</span>
          <span class="final-price">¥{{ order().final_price?.toFixed(2) }}</span>
        </div>
        <div class="price-row" v-if="order().product">
          <span>商品原价</span>
          <span class="original-price">¥{{ order().product?.price?.toFixed(2) }}</span>
        </div>
      </div>

      <!-- 对方信息 -->
      <div class="section">
        <h3>{{ isBuyer() ? '卖家信息' : '买家信息' }}</h3>
        <div class="user-card">
          <img
            :src="getAvatarUrl(isBuyer() ? order().seller?.avatar : order().buyer?.avatar)"
            :alt="isBuyer() ? order().seller?.nickname : order().buyer?.nickname"
            class="user-avatar"
          >
          <div class="user-info">
            <span class="user-nickname">
              {{ isBuyer() ? order().seller?.nickname : order().buyer?.nickname }}
            </span>
            <span class="user-role">{{ isBuyer() ? '卖家' : '买家' }}</span>
          </div>
          <button @click="handleContact" class="contact-btn">联系TA</button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="order().status === 'pending'" class="actions">
        <button
          v-if="canComplete()"
          @click="handleComplete"
          :disabled="isProcessing"
          class="action-btn complete-btn"
        >
          {{ isProcessing ? '处理中...' : '确认完成' }}
        </button>
        <button
          v-if="canCancel()"
          @click="handleCancel"
          :disabled="isProcessing"
          class="action-btn cancel-btn"
        >
          {{ isProcessing ? '处理中...' : '取消订单' }}
        </button>
      </div>

      <!-- 最终状态提示 -->
      <div v-if="order().status === 'completed'" class="status-message completed-msg">
        <span>✔</span> 交易已完成
      </div>
      <div v-else-if="order().status === 'cancelled'" class="status-message cancelled-msg">
        <span>✕</span> 订单已取消
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-detail-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  padding: 16px 24px;
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

.content {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 16px 60px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 状态卡片 */
.status-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.06);
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-label {
  font-size: 15px;
  color: #4C1D95;
  font-weight: 600;
}

.status-badge-lg {
  padding: 5px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.status-pending { background: #FEF3C7; color: #D97706; }
.status-completed { background: #DCFCE7; color: #22C55E; }
.status-cancelled { background: #FEE2E2; color: #EF4444; }

.order-number {
  font-size: 13px;
  color: #8B5CF6;
  margin: 0 0 4px 0;
}

.order-date {
  font-size: 13px;
  color: #A78BFA;
  margin: 0;
}

/* 区块 */
.section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.06);
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.section h3 {
  color: #4C1D95;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 14px 0;
}

/* 商品卡片 */
.product-card {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  padding: 8px;
  border-radius: 12px;
  transition: background 0.2s;
}

.product-card:hover {
  background: #FAF5FF;
}

.product-image-wrapper {
  width: 64px;
  height: 64px;
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

.product-info {
  flex: 1;
  min-width: 0;
}

.product-info h4 {
  color: #1F2937;
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price {
  color: #9CA3AF;
  font-size: 13px;
  margin: 0;
  text-decoration: line-through;
}

.arrow {
  color: #A78BFA;
  font-size: 20px;
  font-weight: 300;
}

/* 价格信息 */
.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.price-row + .price-row {
  border-top: 1px dashed #EDE9FE;
}

.price-row span:first-child {
  color: #6B7280;
  font-size: 14px;
}

.final-price {
  color: #7C3AED;
  font-size: 20px;
  font-weight: 700;
}

.original-price {
  color: #9CA3AF;
  font-size: 14px;
  text-decoration: line-through;
}

/* 用户卡片 */
.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #EDE9FE;
}

.user-info {
  flex: 1;
}

.user-nickname {
  display: block;
  color: #4C1D95;
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 2px;
}

.user-role {
  font-size: 12px;
  color: #8B5CF6;
}

.contact-btn {
  padding: 8px 18px;
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25);
  flex-shrink: 0;
}

.contact-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35);
}

/* 操作按钮 */
.actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.complete-btn {
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25);
}

.complete-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35);
}

.cancel-btn {
  background: linear-gradient(135deg, #EF4444, #DC2626);
  color: white;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
}

.cancel-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

/* 最终状态消息 */
.status-message {
  text-align: center;
  padding: 20px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 600;
}

.completed-msg {
  background: #DCFCE7;
  color: #22C55E;
}

.completed-msg span {
  margin-right: 8px;
}

.cancelled-msg {
  background: #FEE2E2;
  color: #EF4444;
}

.cancelled-msg span {
  margin-right: 8px;
}
</style>
