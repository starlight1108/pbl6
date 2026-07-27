<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useOrderStore } from '../stores/order.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const orderStore = useOrderStore()

const isLoading = ref(true)
const isProcessing = ref(false)
const refundReason = ref('')
const showRefundDialog = ref(false)
const showDeliverDialog = ref(false)
const trackingNumber = ref('')

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

const isOnline = computed(() => order()?.transaction_type === 'online')
const isOffline = computed(() => order()?.transaction_type === 'offline')

const isBuyer = () => {
  return order() && userStore.userId && order().buyer_id === userStore.userId
}

const isSeller = () => {
  return order() && userStore.userId && order().seller_id === userStore.userId
}

// ─── 线下交易触发条件 ─────────────────────────
const canComplete = () => {
  return order() && isOffline.value && order().status === 'pending' && isBuyer()
}

// ─── 线上交易触发条件 ─────────────────────────
const canConfirm = () => isOnline.value && order()?.status === 'pending_confirm' && isSeller()
const canClose = () => isOnline.value && order()?.status === 'pending_confirm' && isSeller()
const canPay = () => isOnline.value && order()?.status === 'pending_payment' && isBuyer()
const canDeliver = () => isOnline.value && order()?.status === 'paid' && isSeller()
const canReceive = () => isOnline.value && order()?.status === 'delivered' && isBuyer()
const canRefundRequest = () => isOnline.value && ['paid', 'delivered'].includes(order()?.status) && isBuyer()
const canRefundAgree = () => isOnline.value && order()?.status === 'refunding' && isSeller()
const canRefundReject = () => isOnline.value && order()?.status === 'refunding' && isSeller()

const canCancel = () => {
  const s = order()?.status
  return ['pending', 'pending_confirm', 'pending_payment'].includes(s)
}

// ─── 线下操作 ────────────────────────────────
const handleComplete = async () => {
  if (!confirm('确定要确认完成此订单吗？')) return
  isProcessing.value = true
  try {
    await orderStore.completeOrder(order().id)
    alert('订单已完成！')
    await fetchOrderDetail()
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
    await fetchOrderDetail()
  } catch (error) {
    alert(error.message || '取消订单失败')
  } finally {
    isProcessing.value = false
  }
}

// ─── 线上操作 ────────────────────────────────
const handleConfirm = async () => {
  if (!confirm('确认接受此订单？')) return
  isProcessing.value = true
  try {
    await orderStore.confirmOrder(order().id)
    alert('已确认订单，等待买家付款')
    await fetchOrderDetail()
  } catch (error) {
    alert(error.message || '确认失败')
  } finally {
    isProcessing.value = false
  }
}

const handleClose = async () => {
  if (!confirm('确定要关闭此订单吗？')) return
  isProcessing.value = true
  try {
    await orderStore.closeOrder(order().id)
    alert('订单已关闭')
    await fetchOrderDetail()
  } catch (error) {
    alert(error.message || '关闭失败')
  } finally {
    isProcessing.value = false
  }
}

const handlePay = async () => {
  if (!confirm(`确认支付 ¥${order()?.final_price?.toFixed(2)}？\n\n资金将由平台担保，确认收货后才释放给卖家。`)) return
  isProcessing.value = true
  try {
    await orderStore.payOrder(order().id)
    alert('支付成功！资金已由平台担保')
    await fetchOrderDetail()
  } catch (error) {
    alert(error.message || '支付失败')
  } finally {
    isProcessing.value = false
  }
}

const handleDeliver = async () => {
  if (!confirm('确认已向买家发货？')) return
  isProcessing.value = true
  try {
    await orderStore.deliverOrder(order().id, trackingNumber.value)
    alert('已标记为已发货，等待买家确认收货')
    showDeliverDialog.value = false
    trackingNumber.value = ''
    await fetchOrderDetail()
  } catch (error) {
    alert(error.message || '发货确认失败')
  } finally {
    isProcessing.value = false
  }
}

const handleReceive = async () => {
  if (!confirm('确认收到商品了吗？确认后资金将释放给卖家。')) return
  isProcessing.value = true
  try {
    await orderStore.receiveOrder(order().id)
    alert('已确认收货，交易完成！')
    await fetchOrderDetail()
  } catch (error) {
    alert(error.message || '确认收货失败')
  } finally {
    isProcessing.value = false
  }
}

const handleRefundRequest = async () => {
  showRefundDialog.value = true
}

const submitRefundRequest = async () => {
  if (!refundReason.value.trim()) {
    alert('请填写退款原因')
    return
  }
  isProcessing.value = true
  try {
    await orderStore.refundRequest(order().id, refundReason.value)
    alert('退款申请已提交，等待卖家处理')
    showRefundDialog.value = false
    refundReason.value = ''
    await fetchOrderDetail()
  } catch (error) {
    alert(error.message || '退款申请失败')
  } finally {
    isProcessing.value = false
  }
}

const handleRefundAgree = async () => {
  if (!confirm('同意退款？资金将退还给买家。')) return
  isProcessing.value = true
  try {
    await orderStore.refundAgree(order().id)
    alert('已同意退款')
    await fetchOrderDetail()
  } catch (error) {
    alert(error.message || '退款处理失败')
  } finally {
    isProcessing.value = false
  }
}

const handleRefundReject = async () => {
  if (!confirm('拒绝退款？买家可申请平台介入。')) return
  isProcessing.value = true
  try {
    await orderStore.refundReject(order().id)
    alert('已拒绝退款，买家可申请平台介入')
    await fetchOrderDetail()
  } catch (error) {
    alert(error.message || '退款拒绝失败')
  } finally {
    isProcessing.value = false
  }
}

// ─── 工具函数 ────────────────────────────────
const handleContact = () => {
  router.push('/chat')
}

const getStatusText = (status) => {
  const map = {
    'pending': '待确认',
    'pending_confirm': '等待卖家确认',
    'pending_payment': '待付款',
    'paid': '已付款',
    'delivered': '待确认收货',
    'completed': '已完成',
    'cancelled': '已取消',
    'closed': '已关闭',
    'refunding': '退款中',
    'refunded': '已退款',
    'disputed': '平台介入中'
  }
  return map[status] || status
}

const getStatusClass = (status) => {
  const map = {
    'pending': 'status-pending',
    'pending_confirm': 'status-pending',
    'pending_payment': 'status-pending',
    'paid': 'status-paid',
    'delivered': 'status-paid',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled',
    'closed': 'status-cancelled',
    'refunding': 'status-pending',
    'refunded': 'status-cancelled',
    'disputed': 'status-pending'
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
        <div class="status-meta">
          <span class="trade-type-badge" :class="order().transaction_type">
            {{ order().transaction_type === 'online' ? '🔒 线上交易' : '🤝 线下交易' }}
          </span>
        </div>
        <p class="order-number">订单编号：#{{ order().id }}</p>
        <p class="order-date">创建时间：{{ formatDate(order().created_at) }}</p>
        <p v-if="order().paid_at" class="order-date">付款时间：{{ formatDate(order().paid_at) }}</p>
        <p v-if="order().auto_complete_at" class="order-date countdown">
          ⏰ 自动确认截止：{{ formatDate(order().auto_complete_at) }}
        </p>
        <p v-if="order().tracking_number" class="order-date">
          📮 快递单号：<span class="tracking-num">{{ order().tracking_number }}</span>
        </p>
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
      <div v-if="order()" class="actions">
        <!-- 线下：确认完成 -->
        <button v-if="canComplete()" @click="handleComplete" :disabled="isProcessing" class="action-btn complete-btn">
          {{ isProcessing ? '处理中...' : '确认完成' }}
        </button>

        <!-- 线上：卖家确认 -->
        <button v-if="canConfirm()" @click="handleConfirm" :disabled="isProcessing" class="action-btn confirm-btn">
          {{ isProcessing ? '处理中...' : '✅ 确认订单' }}
        </button>

        <!-- 线上：卖家关闭 -->
        <button v-if="canClose()" @click="handleClose" :disabled="isProcessing" class="action-btn cancel-btn">
          {{ isProcessing ? '处理中...' : '关闭订单' }}
        </button>

        <!-- 线上：买家付款 -->
        <button v-if="canPay()" @click="handlePay" :disabled="isProcessing" class="action-btn pay-btn">
          {{ isProcessing ? '处理中...' : `💳 确认付款 ¥${order().final_price?.toFixed(2)}` }}
        </button>

        <!-- 线上：卖家发货 -->
        <button v-if="canDeliver()" @click="showDeliverDialog = true" :disabled="isProcessing" class="action-btn deliver-btn">
          {{ isProcessing ? '处理中...' : '📦 确认已发货' }}
        </button>

        <!-- 线上：买家确认收货 -->
        <button v-if="canReceive()" @click="handleReceive" :disabled="isProcessing" class="action-btn complete-btn">
          {{ isProcessing ? '处理中...' : '✅ 确认收货' }}
        </button>

        <!-- 线上：买家申请退款 -->
        <button v-if="canRefundRequest()" @click="handleRefundRequest" :disabled="isProcessing" class="action-btn refund-btn">
          申请退款
        </button>

        <!-- 线上：卖家同意退款 -->
        <button v-if="canRefundAgree()" @click="handleRefundAgree" :disabled="isProcessing" class="action-btn complete-btn">
          {{ isProcessing ? '处理中...' : '同意退款' }}
        </button>

        <!-- 线上：卖家拒绝退款 -->
        <button v-if="canRefundReject()" @click="handleRefundReject" :disabled="isProcessing" class="action-btn cancel-btn">
          {{ isProcessing ? '处理中...' : '拒绝退款' }}
        </button>

        <!-- 通用：取消（线下 pending / 线上未付款） -->
        <button v-if="canCancel()" @click="handleCancel" :disabled="isProcessing" class="action-btn cancel-btn">
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

    <!-- 退款申请弹窗 -->
    <div v-if="showRefundDialog" class="modal-overlay" @click.self="showRefundDialog = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>申请退款</h3>
          <button @click="showRefundDialog = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="refund-info">
            <p>商品：{{ order().product?.title }}</p>
            <p>金额：¥{{ order().final_price?.toFixed(2) }}</p>
          </div>
          <div class="form-group">
            <label for="refundReason">退款原因</label>
            <textarea
              id="refundReason"
              v-model="refundReason"
              placeholder="请描述退款原因..."
              maxlength="500"
              class="refund-textarea"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showRefundDialog = false" class="modal-cancel-btn">取消</button>
          <button @click="submitRefundRequest" :disabled="isProcessing || !refundReason.trim()" class="modal-submit-btn">
            {{ isProcessing ? '提交中...' : '提交退款申请' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 发货确认弹窗 -->
    <div v-if="showDeliverDialog" class="modal-overlay" @click.self="showDeliverDialog = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>确认发货</h3>
          <button @click="showDeliverDialog = false" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div class="refund-info">
            <p>商品：{{ order().product?.title }}</p>
            <p>买家：{{ order().buyer?.nickname }}</p>
          </div>
          <div class="form-group">
            <label for="trackingNumber">快递单号 <span style="color:#999;font-weight:400;font-size:12px">（选填）</span></label>
            <input
              id="trackingNumber"
              v-model="trackingNumber"
              type="text"
              placeholder="请输入快递单号，留空表示无需物流"
              class="tracking-input"
            />
            <p style="font-size:12px;color:#9CA3AF;margin:6px 0 0">校园面交可留空，选择快递配送请填写单号</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showDeliverDialog = false" class="modal-cancel-btn">取消</button>
          <button @click="handleDeliver" :disabled="isProcessing" class="modal-submit-btn">
            {{ isProcessing ? '处理中...' : '确认已发货' }}
          </button>
        </div>
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

/* 线上交易按钮 */
.confirm-btn {
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}
.confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
}

.pay-btn {
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: white;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
}
.pay-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
}

.deliver-btn {
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  color: white;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25);
}
.deliver-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
}

.refund-btn {
  background: linear-gradient(135deg, #F97316, #EA580C);
  color: white;
  box-shadow: 0 4px 14px rgba(249, 115, 22, 0.25);
}
.refund-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(249, 115, 22, 0.35);
}

/* 交易类型标签 */
.status-meta {
  margin-top: 8px;
}

.trade-type-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.trade-type-badge.online {
  background: #EDE9FE;
  color: #7C3AED;
}
.trade-type-badge.offline {
  background: #DCFCE7;
  color: #16A34A;
}

.order-date.countdown {
  color: #F59E0B;
  font-weight: 600;
}

/* 退款弹窗 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 460px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.modal-body {
  padding: 20px 24px;
}

.refund-info {
  background: #F8F6FF;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.refund-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.refund-textarea {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #E5E7EB;
  border-radius: 10px;
  font-size: 14px;
  color: #333;
  resize: none;
  min-height: 100px;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
}

.refund-textarea:focus {
  outline: none;
  border-color: #7C3AED;
}

.tracking-input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #E5E7EB;
  border-radius: 10px;
  font-size: 14px;
  color: #333;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.tracking-input:focus {
  outline: none;
  border-color: #7C3AED;
}

.tracking-input::placeholder {
  color: #bbb;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 0 24px 20px;
}

.modal-cancel-btn,
.modal-submit-btn {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.modal-cancel-btn {
  background: #F3F4F6;
  color: #666;
}

.modal-cancel-btn:hover {
  background: #E5E7EB;
}

.modal-submit-btn {
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
}

.modal-submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.modal-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
