<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useReportStore } from '../stores/report.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const reportStore = useReportStore()

const product = ref(null)
const comments = ref([])
const newComment = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)
const showReportModal = ref(false)
const reportReason = ref('')
const reportDescription = ref('')
const isReporting = ref(false)
const hasReported = ref(false)

const reportReasons = [
  '虚假信息',
  '违禁商品',
  '欺诈行为',
  '侵犯权益',
  '不当内容',
  '其他原因'
]

const fetchProduct = async () => {
  const productId = route.params.id
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products/${productId}`)
    const data = await response.json()
    if (data.product) {
      product.value = data.product
      checkReportStatus()
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

const openReportModal = () => {
  if (!userStore.isLoggedIn) {
    alert('请先登录')
    router.push('/login')
    return
  }
  showReportModal.value = true
}

const closeReportModal = () => {
  showReportModal.value = false
  reportReason.value = ''
  reportDescription.value = ''
}

const submitReport = async () => {
  if (!reportReason.value) {
    alert('请选择举报原因')
    return
  }
  
  if (isReporting.value) return
  
  isReporting.value = true
  
  try {
    await reportStore.createReport(
      product.value.id,
      reportReason.value,
      reportDescription.value
    )
    alert('举报成功，我们会尽快处理')
    hasReported.value = true
    closeReportModal()
  } catch (error) {
    alert(error.message || '举报失败')
  } finally {
    isReporting.value = false
  }
}

const checkReportStatus = async () => {
  if (userStore.isLoggedIn && product.value) {
    try {
      hasReported.value = await reportStore.checkReported(product.value.id)
    } catch (error) {
      console.error('检查举报状态失败:', error)
    }
  }
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
          
          <div class="product-actions">
            <button 
              v-if="userStore.isLoggedIn && product.seller?.id !== userStore.userId" 
              @click="openReportModal" 
              :disabled="hasReported"
              class="report-button"
            >
              {{ hasReported ? '已举报' : '举报商品' }}
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="showReportModal" class="modal-overlay" @click.self="closeReportModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>举报商品</h3>
            <button @click="closeReportModal" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>举报原因 <span class="required">*</span></label>
              <select v-model="reportReason" class="form-select">
                <option value="">请选择举报原因</option>
                <option v-for="reason in reportReasons" :key="reason" :value="reason">
                  {{ reason }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>详细说明</label>
              <textarea 
                v-model="reportDescription" 
                placeholder="请详细描述举报原因（选填）"
                maxlength="500"
                class="form-textarea"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="closeReportModal" class="cancel-btn">取消</button>
            <button 
              @click="submitReport" 
              :disabled="!reportReason || isReporting" 
              class="submit-btn"
            >
              {{ isReporting ? '提交中...' : '提交举报' }}
            </button>
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

.product-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.report-button {
  padding: 10px 20px;
  background-color: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.report-button:hover:not(:disabled) {
  background-color: #f57c00;
}

.report-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.modal-overlay {
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

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
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
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: bold;
}

.required {
  color: #f44336;
}

.form-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 100px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #eee;
}

.cancel-btn {
  padding: 10px 20px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.submit-btn {
  padding: 10px 20px;
  background-color: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.submit-btn:hover:not(:disabled) {
  background-color: #f57c00;
}

.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>