<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import ReportModal from '../components/ReportModal.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const product = ref(null)
const comments = ref([])
const newComment = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)
const showReportModal = ref(false)

// 议价相关状态
const showOfferModal = ref(false)
const offerPrice = ref('')
const isSubmittingOffer = ref(false)
const currentOffer = ref(null)

// 卖家视角的议价请求列表
const sellerOffers = ref([])
const isProcessingOffer = ref(false)

const fetchProduct = async () => {
  const productId = route.params.id
  
  // 重置议价状态
  currentOffer.value = null
  sellerOffers.value = []
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products/${productId}`)
    const data = await response.json()
    if (data.product) {
      product.value = data.product
    } else {
      alert('商品不存在')
      router.push('/')
    }
  } catch (error) {
    console.error('获取商品详情失败:', error)
    alert('获取商品详情失败')
    router.push('/')
  } finally {
    isLoading.value = false
  }
}

const fetchComments = async () => {
  const productId = route.params.id
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products/${productId}/comments`)
    const data = await response.json()
    if (data.comments) {
      comments.value = data.comments
    }
  } catch (error) {
    console.error('获取评论失败:', error)
  }
}

const fetchCurrentOffer = async () => {
  if (!userStore.token || !product.value) return
  
  const productId = route.params.id
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/offers/buyer?product_id=${productId}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()
    if (data.offers && data.offers.length > 0) {
      currentOffer.value = data.offers[0]
    }
  } catch (error) {
    console.error('获取议价信息失败:', error)
  }
}

const fetchSellerOffers = async () => {
  if (!userStore.token || !product.value || !isSeller()) return
  
  const productId = route.params.id
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/offers/seller?product_id=${productId}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()
    if (data.offers) {
      sellerOffers.value = data.offers
    }
  } catch (error) {
    console.error('获取议价请求失败:', error)
  }
}

const acceptOffer = async (offerId) => {
  if (!confirm('确定要同意这个议价请求吗？')) {
    return
  }
  
  isProcessingOffer.value = true
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      alert('议价已同意，页面将刷新以显示更新后的价格')
      // 刷新页面以显示更新后的商品价格
      window.location.reload()
    } else {
      alert(data.error || '同意议价失败')
    }
  } catch (error) {
    console.error('同意议价失败:', error)
    alert('同意议价失败')
  } finally {
    isProcessingOffer.value = false
  }
}

const rejectOffer = async (offerId) => {
  if (!confirm('确定要拒绝这个议价请求吗？')) {
    return
  }
  
  isProcessingOffer.value = true
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/offers/${offerId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      alert('议价已拒绝')
      // 更新议价状态
      const offerIndex = sellerOffers.value.findIndex(o => o.id === offerId)
      if (offerIndex !== -1) {
        sellerOffers.value[offerIndex].status = 'rejected'
      }
    } else {
      alert(data.error || '拒绝议价失败')
    }
  } catch (error) {
    console.error('拒绝议价失败:', error)
    alert('拒绝议价失败')
  } finally {
    isProcessingOffer.value = false
  }
}

const submitComment = async () => {
  if (!newComment.value.trim()) {
    alert('请输入评论内容')
    return
  }
  
  if (newComment.value.length > 500) {
    alert('评论内容不能超过500字')
    return
  }

  isSubmitting.value = true
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products/${route.params.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ content: newComment.value.trim() })
    })

    const data = await response.json()
    
    if (response.ok) {
      comments.value.unshift(data.comment)
      newComment.value = ''
      alert('评论成功')
    } else {
      alert(data.error || '评论失败')
    }
  } catch (error) {
    console.error('提交评论失败:', error)
    alert('提交评论失败')
  } finally {
    isSubmitting.value = false
  }
}

const deleteComment = async (commentId) => {
  if (!confirm('确定要删除这条评论吗？')) {
    return
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    if (response.ok) {
      comments.value = comments.value.filter(c => c.id !== commentId)
      alert('删除成功')
    } else {
      const data = await response.json()
      alert(data.error || '删除失败')
    }
  } catch (error) {
    console.error('删除评论失败:', error)
    alert('删除评论失败')
  }
}


const openOfferModal = () => {
  if (!userStore.token) {
    alert('请先登录')
    router.push('/login')
    return
  }
  
  if (isSeller()) {
    alert('不能对自己的商品议价')
    return
  }
  
  showOfferModal.value = true
}

const closeOfferModal = () => {
  showOfferModal.value = false
  offerPrice.value = ''
}

const submitOffer = async () => {
  console.log('=== 提交议价 ===')
  console.log('议价金额:', offerPrice.value)
  console.log('商品ID:', route.params.id)
  console.log('商品原价:', product.value?.price)
  console.log('Token:', userStore.token ? '存在 (' + userStore.token.length + '字符)' : '无')

  if (!offerPrice.value || isNaN(offerPrice.value) || parseFloat(offerPrice.value) <= 0) {
    alert('请输入有效的议价金额')
    return
  }

  const price = parseFloat(offerPrice.value)
  if (price >= product.value.price) {
    alert('议价金额必须低于商品原价')
    return
  }

  if (!userStore.token) {
    alert('请先登录')
    router.push('/login')
    return
  }

  isSubmittingOffer.value = true

  try {
    const response = await fetch('http://127.0.0.1:5000/api/offers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        seller_id: product.value.seller_id,
        product_id: product.value.id,
        offered_price: price
      })
    })

    console.log('响应状态', response.status)

    if (response.status === 401) {
      alert('登录状态已过期，请重新登录')
      userStore.logout()
      router.push('/login')
      return
    }

    const data = await response.json()
    console.log('响应数据:', data)

    if (response.ok) {
      alert('议价请求已发送，等待卖家回复')
      currentOffer.value = data.offer
      closeOfferModal()
    } else {
      alert(data.error || '议价失败')
    }
  } catch (error) {
    console.error('提交议价失败:', error)
    alert('提交议价失败: ' + error.message)
  } finally {
    isSubmittingOffer.value = false
  }
}

const contactSeller = async () => {
  if (!product.value || !userStore.token) return

  try {
    const response = await fetch('http://127.0.0.1:5000/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        product_id: route.params.id
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

const isSeller = () => {
  return userStore.userId && product.value && product.value.seller_id === userStore.userId
}

const getOfferStatusText = (status) => {
  const statusMap = {
    'pending': '待回复',
    'accepted': '已同意',
    'rejected': '已拒绝',
    'canceled': '已取消'
  }
  return statusMap[status] || status
}

const getOfferStatusClass = (status) => {
  const classMap = {
    'pending': 'offer-status-pending',
    'accepted': 'offer-status-accepted',
    'rejected': 'offer-status-rejected',
    'canceled': 'offer-status-canceled'
  }
  return classMap[status] || ''
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

onMounted(() => {
  fetchProduct().then(() => {
    fetchCurrentOffer()
    fetchSellerOffers()
  })
  fetchComments()
})
</script>

<template>
  <div class="product-detail-container">
    <div class="header">
      <h1>商品详情</h1>
      <button @click="router.push('/')" class="back-button">返回首页</button>
    </div>

    <div v-if="isLoading" class="loading">
      加载中...
    </div>

    <div v-else-if="product" class="product-content">
      <div class="product-main">
        <div class="product-image-wrapper">
          <img :src="'http://127.0.0.1:5000' + product.image" :alt="product.title" class="product-image">
        </div>
        
        <div class="product-info">
          <h2 class="product-title">{{ product.title }}</h2>
          <div class="price-section">
            <p class="product-price">¥{{ product.price.toFixed(2) }}</p>
            <button 
              v-if="!isSeller() && product.status === 'active'" 
              @click="openOfferModal" 
              class="offer-button"
            >
              议价
            </button>
          </div>
          
          <!-- 议价状态显示 -->
          <div v-if="currentOffer" class="offer-status">
            <span class="offer-label">议价状态：</span>
            <span :class="['offer-status-badge', getOfferStatusClass(currentOffer.status)]">
              {{ getOfferStatusText(currentOffer.status) }}
            </span>
            <span v-if="currentOffer.status !== 'canceled'" class="offer-price">
              议价金额：¥{{ currentOffer.offered_price.toFixed(2) }}
            </span>
          </div>
          
          <p class="product-category">分类：{{ product.category }}</p>
          <p class="product-status" :class="{ 'inactive': product.status !== 'active' }">
            {{ product.status === 'active' ? '在售' : '已下架' }}
          </p>
          <p class="product-seller">卖家：{{ product.seller?.nickname || '未知' }}</p>
          <p class="product-date">发布时间：{{ formatDate(product.created_at) }}</p>
          <p class="product-description">{{ product.description }}</p>
          

          <!-- 卖家视角：议价请求列表 -->
          <div v-if="isSeller()" class="seller-offers-section">
            <h3>议价请求 ({{ sellerOffers.length }})</h3>
            
            <div v-if="sellerOffers.length === 0" class="no-offers">
              <p>暂无议价请求</p>
            </div>
            
            <div v-else class="offers-list">
              <div v-for="offer in sellerOffers" :key="offer.id" class="offer-item">
                <div class="offer-header">
                  <span class="buyer-info">买家：{{ offer.buyer?.nickname || '匿名买家' }}</span>
                  <span :class="['offer-status-badge', getOfferStatusClass(offer.status)]">
                    {{ getOfferStatusText(offer.status) }}
                  </span>
                </div>
                <div class="offer-content">
                  <div class="price-info">
                    <span class="original">原价：¥{{ offer.original_price?.toFixed(2) }}</span>
                    <span class="offered">议价：¥{{ offer.offered_price?.toFixed(2) }}</span>
                  </div>
                  <p class="offer-time">{{ formatDate(offer.created_at) }}</p>
                </div>
                <div v-if="offer.status === 'pending'" class="offer-actions">
                  <button 
                    @click="acceptOffer(offer.id)" 
                    :disabled="isProcessingOffer" 
                    class="action-btn accept-btn"
                  >
                    同意
                  </button>
                  <button 
                    @click="rejectOffer(offer.id)" 
                    :disabled="isProcessingOffer" 
                    class="action-btn reject-btn"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="userStore.token && userStore.id !== product.seller_id" class="product-actions">
            <button @click="contactSeller" class="contact-btn">联系卖家</button>
            <button @click="showReportModal = true" class="report-btn">举报商品</button>
          </div>
        </div>
      </div>

      <ReportModal 
        v-if="showReportModal"
        :productId="product.id"
        :productTitle="product.title"
        @close="showReportModal = false"
        @success="showReportModal = false"
      />

      <div class="comments-section">
        <h3>商品评论 ({{ comments.length }})</h3>
        
        <div v-if="userStore.token" class="comment-input">
          <textarea 
            v-model="newComment" 
            placeholder="写下您的评论..." 
            maxlength="500"
            class="comment-textarea"
          ></textarea>
          <button @click="submitComment" :disabled="isSubmitting" class="submit-comment-btn">
            {{ isSubmitting ? '提交中...' : '发表评论' }}
          </button>
        </div>

        <div v-if="comments.length === 0" class="no-comments">
          <p>暂无评论，快来发表第一条评论吧！</p>
        </div>

        <div v-else class="comments-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-header">
              <img 
                :src="comment.user?.avatar || '/static/images/default-avatar.png'" 
                :alt="comment.user?.nickname" 
                class="comment-avatar"
              >
              <div class="comment-user-info">
                <span class="comment-username">{{ comment.user?.nickname || '匿名用户' }}</span>
                <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
              </div>
              <button 
                v-if="userStore.token && comment.user?.id === userStore.userId" 
                @click="deleteComment(comment.id)" 
                class="delete-comment-btn"
              >
                删除
              </button>
            </div>
            <p class="comment-content">{{ comment.content }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 议价弹窗 -->
    <div v-if="showOfferModal" class="modal-overlay" @click.self="closeOfferModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>议价</h3>
          <button @click="closeOfferModal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <p class="original-price">原价：¥{{ product?.price.toFixed(2) }}</p>
          <div class="form-group">
            <label for="offerPrice">您的议价金额</label>
            <input 
              type="number" 
              id="offerPrice" 
              v-model="offerPrice" 
              placeholder="请输入议价金额"
              step="0.01"
              :max="product && product.price ? product.price - 0.01 : 999999"
              min="0.01"
              class="offer-input"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeOfferModal" class="cancel-btn">取消</button>
          <button @click="submitOffer" :disabled="isSubmittingOffer" class="submit-offer-btn">
            {{ isSubmittingOffer ? '提交中...' : '提交议价' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-detail-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  padding: 20px;
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
  margin-bottom: 20px;
  border-radius: 16px;
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.header h1 {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}

.back-button {
  padding: 10px 22px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
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

.loading {
  text-align: center;
  padding: 80px 20px;
  font-size: 16px;
  color: #7C3AED;
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

.product-content {
  max-width: 1200px;
  margin: 0 auto;
}

.product-main {
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
  padding: 24px;
  margin-bottom: 20px;
  display: flex;
  gap: 30px;
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.product-image-wrapper {
  flex-shrink: 0;
  width: 400px;
  height: 400px;
  overflow: hidden;
  border-radius: 16px;
  background: linear-gradient(135deg, #FAF5FF, #EDE9FE);
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  flex: 1;
}

.product-title {
  color: #1F2937;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 15px;
}

.price-section {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.product-price {
  color: #7C3AED;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.offer-button {
  padding: 10px 22px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
}

.offer-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
}

.offer-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #FAF5FF;
  border-radius: 12px;
  margin-bottom: 15px;
  border: 1px solid rgba(124, 58, 237, 0.1);
}

.offer-label {
  font-size: 14px;
  color: #6B7280;
}

.offer-status-badge {
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.offer-status-pending { background: #FEF3C7; color: #D97706; }
.offer-status-accepted { background: #DCFCE7; color: #22C55E; }
.offer-status-rejected { background: #FEE2E2; color: #EF4444; }
.offer-status-canceled { background: #F3F4F6; color: #9CA3AF; }

.offer-price {
  font-size: 14px;
  color: #7C3AED;
  font-weight: 600;
}

.product-category,
.product-status,
.product-seller,
.product-date {
  color: #6B7280;
  font-size: 14px;
  margin-bottom: 8px;
}

.product-status { color: #22C55E; font-weight: 600; }
.product-status.inactive { color: #EF4444; }

.product-description {
  color: #374151;
  font-size: 16px;
  line-height: 1.7;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #EDE9FE;
}

/* 卖家议价请求区域 */
.seller-offers-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #EDE9FE;
}

.seller-offers-section h3 {
  color: #4C1D95;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
}

.product-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #EDE9FE;
}

.no-offers {
  text-align: center;
  padding: 24px;
  color: #7C3AED;
  opacity: 0.6;
  background: #FAF5FF;
  border-radius: 12px;
  border: 2px dashed #EDE9FE;
}

.offers-list { display: flex; flex-direction: column; gap: 12px; }

.offer-item {
  background: #FAF5FF;
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(124, 58, 237, 0.08);
}

.offer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.buyer-info {
  font-size: 14px;
  font-weight: 600;
  color: #4C1D95;
}

.price-info {
  display: flex;
  gap: 15px;
  margin-bottom: 8px;
}

.price-info .original {
  font-size: 14px;
  color: #9CA3AF;
  text-decoration: line-through;
}

.price-info .offered {
  font-size: 16px;
  color: #7C3AED;
  font-weight: 700;
}

.offer-time { font-size: 12px; color: #A78BFA; margin: 0; }

.offer-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(124, 58, 237, 0.15);
}

.offer-actions .action-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.accept-btn {
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25);
}

.accept-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35);
}

.reject-btn {
  background: linear-gradient(135deg, #EF4444, #DC2626);
  color: white;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
}

.reject-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.contact-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25);
  margin-right: 10px;
}

.contact-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(34, 197, 94, 0.35);
}

.report-btn {
  padding: 12px 32px;
  background: linear-gradient(135deg, #EF4444, #DC2626);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
}

.report-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.35);
}

.comments-section {
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
  padding: 24px;
  border: 1px solid rgba(124, 58, 237, 0.06);
}

.comments-section h3 {
  color: #4C1D95;
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
}

.comment-input { margin-bottom: 20px; }

.comment-textarea {
  width: 100%;
  min-height: 100px;
  padding: 14px;
  border: 2px solid #EDE9FE;
  border-radius: 14px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
  background: #FAF5FF;
  transition: all 0.25s ease;
  outline: none;
  font-family: inherit;
}

.comment-textarea:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

.submit-comment-btn {
  margin-top: 10px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}

.submit-comment-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
}

.submit-comment-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

.no-comments { text-align: center; padding: 40px; color: #7C3AED; opacity: 0.6; }

.comments-list { margin-top: 20px; }

.comment-item {
  padding: 16px;
  border-bottom: 1px solid #EDE9FE;
}

.comment-item:last-child { border-bottom: none; }

.comment-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #EDE9FE;
}

.comment-user-info { margin-left: 12px; display: flex; flex-direction: column; }

.comment-username { color: #4C1D95; font-weight: 600; font-size: 14px; }
.comment-time { color: #A78BFA; font-size: 12px; }

.delete-comment-btn {
  margin-left: auto;
  padding: 5px 12px;
  background: #FEE2E2;
  color: #EF4444;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.delete-comment-btn:hover {
  background: #EF4444;
  color: white;
}

.comment-content {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  padding-left: 52px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 20px 60px rgba(124, 58, 237, 0.15);
  animation: slideUp 0.25s ease;
  border: 1px solid rgba(124, 58, 237, 0.08);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #EDE9FE;
}

.modal-header h3 { margin: 0; color: #4C1D95; font-size: 18px; font-weight: 600; }

.close-btn {
  background: #F3F4F6;
  border: none;
  font-size: 20px;
  color: #6B7280;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover { background: #E5E7EB; color: #1F2937; }

.modal-body { padding: 24px; }

.original-price {
  font-size: 16px;
  color: #6B7280;
  margin-bottom: 20px;
}

.form-group { margin-bottom: 16px; }

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #4C1D95;
  font-size: 14px;
  font-weight: 600;
}

.offer-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 15px;
  background: #FAF5FF;
  outline: none;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.offer-input:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #EDE9FE;
}

.cancel-btn,
.submit-offer-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.cancel-btn {
  background: #F3F4F6;
  color: #6B7280;
}

.cancel-btn:hover {
  background: #E5E7EB;
}

.submit-offer-btn {
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}

.submit-offer-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
}

.submit-offer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
</style>
