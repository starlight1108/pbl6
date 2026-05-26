<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useOfferStore } from '../stores/offer.js'
import ReportModal from '../components/ReportModal.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const offerStore = useOfferStore()

const product = ref(null)
const comments = ref([])
const newComment = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)
const showReportModal = ref(false)
const reportSuccess = ref(false)
const sellerOffers = ref([])
const showOfferModal = ref(false)
const offerPrice = ref('')
const offerMessage = ref('')
const isProcessingOffer = ref(false)
const isSubmittingOffer = ref(false)

const isSeller = computed(() => {
  return product.value && userStore.id === product.value.seller_id
})

const getOfferStatusText = (status) => {
  const texts = {
    'pending': '待处理',
    'accepted': '已接受',
    'rejected': '已拒绝'
  }
  return texts[status] || status
}

const getOfferStatusClass = (status) => {
  const classes = {
    'pending': 'status-pending',
    'accepted': 'status-accepted',
    'rejected': 'status-rejected'
  }
  return classes[status] || ''
}

const fetchProduct = async () => {
  const productId = route.params.id
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products/${productId}`)
    const data = await response.json()
    if (data.product) {
      product.value = data.product
      if (userStore.id === data.product.seller_id) {
        await fetchSellerOffers()
      }
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
        seller_id: product.value.seller_id,
        product_id: product.value.id
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

const handleReport = () => {
  showReportModal.value = true
}

const handleReportSuccess = () => {
  reportSuccess.value = true
  alert('举报成功，我们会尽快处理')
}

const fetchSellerOffers = async () => {
  if (isSeller.value && product.value) {
    try {
      const offers = await offerStore.fetchSellerOffers(product.value.id)
      sellerOffers.value = offers
    } catch (error) {
      console.error('获取报价失败:', error)
    }
  }
}

const handleMakeOffer = () => {
  showOfferModal.value = true
}

const submitOffer = async () => {
  if (!offerPrice.value || parseFloat(offerPrice.value) <= 0) {
    alert('请输入有效的报价')
    return
  }
  
  isSubmittingOffer.value = true
  
  try {
    await offerStore.createOffer(product.value.id, parseFloat(offerPrice.value), offerMessage.value)
    alert('报价成功')
    showOfferModal.value = false
    offerPrice.value = ''
    offerMessage.value = ''
  } catch (error) {
    alert(error.message || '报价失败')
  } finally {
    isSubmittingOffer.value = false
  }
}

const acceptOffer = async (offerId) => {
  if (!confirm('确定接受此报价吗？接受后商品将标记为已售出。')) {
    return
  }
  
  isProcessingOffer.value = true
  
  try {
    await offerStore.acceptOffer(offerId)
    alert('报价已接受')
    await fetchProduct()
    await fetchSellerOffers()
  } catch (error) {
    alert(error.message || '接受报价失败')
  } finally {
    isProcessingOffer.value = false
  }
}

const rejectOffer = async (offerId) => {
  if (!confirm('确定拒绝此报价吗？')) {
    return
  }
  
  isProcessingOffer.value = true
  
  try {
    await offerStore.rejectOffer(offerId)
    alert('报价已拒绝')
    await fetchSellerOffers()
  } catch (error) {
    alert(error.message || '拒绝报价失败')
  } finally {
    isProcessingOffer.value = false
  }
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
  fetchProduct()
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
          <p class="product-price">¥{{ product.price.toFixed(2) }}</p>
          <p class="product-category">分类：{{ product.category }}</p>
          <p class="product-status" :class="{ 'inactive': product.status !== 'active' }">
            {{ product.status === 'active' ? '在售' : '已下架' }}
          </p>
          <p class="product-seller">卖家：{{ product.seller?.nickname || '未知' }}</p>
          <p class="product-date">发布时间：{{ formatDate(product.created_at) }}</p>
          <p class="product-description">{{ product.description }}</p>
          
          <div v-if="isSeller()" class="seller-offers-section">
            <h3>收到的报价 ({{ sellerOffers.length }})</h3>
            
            <div v-if="sellerOffers.length === 0" class="no-offers">
              <p>暂无报价</p>
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
                    <span class="offered">报价：¥{{ offer.offered_price?.toFixed(2) }}</span>
                  </div>
                  <p class="offer-time">{{ formatDate(offer.created_at) }}</p>
                </div>
                <div v-if="offer.status === 'pending'" class="offer-actions">
                  <button 
                    @click="acceptOffer(offer.id)" 
                    :disabled="isProcessingOffer" 
                    class="action-btn accept-btn" 
                  >
                    接受
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
          
          <div v-if="userStore.token" class="product-actions">
            <button v-if="userStore.id !== product.seller_id && product.status === 'active'" @click="contactSeller" class="contact-btn">联系卖家</button>
            <button v-if="userStore.id !== product.seller_id && product.status === 'active'" @click="handleMakeOffer" class="offer-btn">发起报价</button>
            <button v-if="userStore.id !== product.seller_id" @click="handleReport" class="report-btn">举报商品</button>
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
    
    <ReportModal 
      :visible="showReportModal"
      :productId="product?.id"
      :productTitle="product?.title"
      @close="showReportModal = false"
      @success="handleReportSuccess"
    />
    
    <div v-if="showOfferModal" class="offer-modal-overlay" @click.self="showOfferModal = false">
      <div class="offer-modal">
        <div class="modal-header">
          <h3>发起报价</h3>
          <button @click="showOfferModal = false" class="close-btn">×</button>
        </div>
        
        <div class="modal-body">
          <div class="product-info">
            <span class="product-title">{{ product?.title }}</span>
            <span class="product-price">原价：¥{{ product?.price?.toFixed(2) }}</span>
          </div>
          
          <div class="form-group">
            <label>您的报价 *</label>
            <input 
              v-model="offerPrice" 
              type="number" 
              step="0.01"
              placeholder="请输入您的报价"
              class="price-input"
            />
          </div>
          
          <div class="form-group">
            <label>留言（可选）</label>
            <textarea 
              v-model="offerMessage" 
              placeholder="可以向卖家说明您的报价理由..."
              rows="3"
              class="message-input"
            ></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="showOfferModal = false" class="cancel-btn">取消</button>
          <button 
            @click="submitOffer" 
            class="submit-btn"
            :disabled="isSubmittingOffer"
          >
            {{ isSubmittingOffer ? '提交中...' : '提交报价' }}
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

.product-price {
  color: #f44336;
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 10px;
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

.product-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
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

.report-btn {
  padding: 12px 32px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-weight: 500;
  margin-left: 10px;
}

.report-btn:hover {
  background-color: #d32f2f;
}

.offer-btn {
  padding: 12px 32px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-weight: 500;
  margin-left: 10px;
}

.offer-btn:hover {
  background-color: #F57C00;
}

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

.no-offers {
  text-align: center;
  padding: 20px;
  color: #999;
}

.offers-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.offer-item {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
}

.offer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.buyer-info {
  font-size: 14px;
  color: #333;
}

.offer-status-badge {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-pending {
  background-color: #FFF3E0;
  color: #FF9800;
}

.status-accepted {
  background-color: #E8F5E9;
  color: #4CAF50;
}

.status-rejected {
  background-color: #FFEBEE;
  color: #f44336;
}

.offer-content {
  margin-bottom: 10px;
}

.price-info {
  display: flex;
  gap: 20px;
  margin-bottom: 5px;
}

.original {
  font-size: 14px;
  color: #999;
}

.offered {
  font-size: 14px;
  color: #FF9800;
  font-weight: bold;
}

.offer-time {
  font-size: 12px;
  color: #999;
}

.offer-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
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

.offer-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.offer-modal {
  background-color: white;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.offer-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.offer-modal .modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.offer-modal .close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.offer-modal .close-btn:hover {
  color: #333;
}

.offer-modal .modal-body {
  padding: 20px;
}

.offer-modal .product-info {
  background-color: #f5f5f5;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.offer-modal .product-title {
  display: block;
  color: #333;
  font-size: 14px;
  margin-bottom: 5px;
}

.offer-modal .product-price {
  display: block;
  color: #f44336;
  font-size: 14px;
}

.offer-modal .form-group {
  margin-bottom: 15px;
}

.offer-modal .form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.offer-modal .price-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.offer-modal .price-input:focus {
  outline: none;
  border-color: #FF9800;
}

.offer-modal .message-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
}

.offer-modal .message-input:focus {
  outline: none;
  border-color: #FF9800;
}

.offer-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #eee;
}

.offer-modal .cancel-btn {
  padding: 10px 20px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.offer-modal .cancel-btn:hover {
  background-color: #e8e8e8;
}

.offer-modal .submit-btn {
  padding: 10px 20px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.offer-modal .submit-btn:hover:not(:disabled) {
  background-color: #F57C00;
}

.offer-modal .submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
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
</style>