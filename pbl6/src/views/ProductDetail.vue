<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const product = ref(null)
const comments = ref([])
const newComment = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)

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

          </div>
        </div>
      </div>

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
            {{ isSubmittingOffer ? '提交�?..' : '提交议价' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-detail-container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.header {
  background-color: white;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h1 {
  color: #4CAF50;
  margin: 0;
}

.back-button {
  padding: 8px 16px;
  background-color: #666;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #555;
}

.loading {
  text-align: center;
  padding: 50px;
  font-size: 18px;
  color: #666;
}

.product-content {
  max-width: 1200px;
  margin: 0 auto;
}

.product-main {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  gap: 30px;
}

.product-image-wrapper {
  flex-shrink: 0;
  width: 400px;
  height: 400px;
  overflow: hidden;
  border-radius: 8px;
  background-color: #f5f5f5;
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
  color: #333;
  font-size: 24px;
  margin-bottom: 15px;
}

.price-section {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.product-price {
  color: #f44336;
  font-size: 32px;
  font-weight: bold;
  margin: 0;
}

.offer-button {
  padding: 10px 20px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.offer-button:hover {
  background-color: #f57c00;
}

.offer-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 15px;
}

.offer-label {
  font-size: 14px;
  color: #666;
}

.offer-status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
}

.offer-status-pending {
  background-color: #fff3e0;
  color: #ff9800;
}

.offer-status-accepted {
  background-color: #e8f5e9;
  color: #4CAF50;
}

.offer-status-rejected {
  background-color: #ffebee;
  color: #f44336;
}

.offer-status-canceled {
  background-color: #f5f5f5;
  color: #999;
}

.offer-price {
  font-size: 14px;
  color: #f44336;
  font-weight: bold;
}

.product-category,
.product-status,
.product-seller,
.product-date {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.product-status {
  color: #4CAF50;
  font-weight: bold;
}

.product-status.inactive {
  color: #f44336;
}

.product-description {
  color: #333;
  font-size: 16px;
  line-height: 1.6;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}


/* 卖家议价请求区域 */
.seller-offers-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.seller-offers-section h3 {
  color: #333;
  font-size: 18px;
  margin-bottom: 15px;
}

.product-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.no-offers {
  text-align: center;
  padding: 20px;
  color: #999;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.offers-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.offer-item {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
}

.offer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.buyer-info {
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.price-info {
  display: flex;
  gap: 15px;
  margin-bottom: 8px;
}

.price-info .original {
  font-size: 14px;
  color: #666;
  text-decoration: line-through;
}

.price-info .offered {
  font-size: 16px;
  color: #f44336;
  font-weight: bold;
}

.offer-time {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.offer-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ddd;
}

.offer-actions .action-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.accept-btn {
  background-color: #4CAF50;
  color: white;
}

.accept-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.reject-btn {
  background-color: #f44336;
  color: white;
}

.reject-btn:hover:not(:disabled) {
  background-color: #d32f2f;
}

.action-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.contact-btn {
  padding: 12px 32px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-weight: 500;
}

.contact-btn:hover {
  background-color: #F57C00;

}

.comments-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.comments-section h3 {
  color: #333;
  margin-bottom: 20px;
  font-size: 20px;
}

.comment-input {
  margin-bottom: 20px;
}

.comment-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.submit-comment-btn {
  margin-top: 10px;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.submit-comment-btn:hover:not(:disabled) {
  background-color: #45a049;
}

.submit-comment-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.no-comments {
  text-align: center;
  padding: 40px;
  color: #999;
}

.comments-list {
  margin-top: 20px;
}

.comment-item {
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.comment-item:last-child {
  border-bottom: none;
}

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
}

.comment-user-info {
  margin-left: 12px;
  display: flex;
  flex-direction: column;
}

.comment-username {
  color: #333;
  font-weight: bold;
  font-size: 14px;
}

.comment-time {
  color: #999;
  font-size: 12px;
}

.delete-comment-btn {
  margin-left: auto;
  padding: 4px 8px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.delete-comment-btn:hover {
  background-color: #d32f2f;
}

.comment-content {
  color: #333;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  padding-left: 52px;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 450px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.original-price {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}

.original-price strong {
  color: #f44336;
  font-size: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #555;
  font-size: 14px;
  font-weight: bold;
}

.offer-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.offer-input:focus {
  outline: none;
  border-color: #FF9800;
}

.offer-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
}

.offer-textarea:focus {
  outline: none;
  border-color: #FF9800;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.cancel-btn {
  flex: 1;
  padding: 12px;
  background-color: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.submit-offer-btn {
  flex: 2;
  padding: 12px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.submit-offer-btn:hover:not(:disabled) {
  background-color: #f57c00;
}

.submit-offer-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
