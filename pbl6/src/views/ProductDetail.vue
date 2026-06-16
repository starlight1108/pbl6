<script setup>
import { ref, onMounted, computed } from 'vue'
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

// 卖家修改价格相关
const editPrice = ref('')
const isUpdatingPrice = ref(false)
const showPriceModal = ref(false)

// 管理员处理举报相关
const reports = ref([])
const showReportPanel = ref(false)
const selectedReportId = ref(null)
const handleResult = ref('')
const isHandling = ref(false)

const isFromReport = computed(() => route.query.fromReport === 'true')

const openPriceModal = () => {
  showPriceModal.value = true
}

const closePriceModal = () => {
  showPriceModal.value = false
  editPrice.value = ''
}

const fetchProduct = async () => {
  const productId = route.params.id
  
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


const updatePrice = async () => {
  if (!editPrice.value || isUpdatingPrice.value) return
  
  const newPrice = parseFloat(editPrice.value)
  if (isNaN(newPrice) || newPrice <= 0) {
    alert('请输入有效的价格')
    return
  }
  
  isUpdatingPrice.value = true
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/products/${route.params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ price: newPrice })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      product.value.price = newPrice
      closePriceModal()
      alert('价格修改成功！')
    } else {
      alert(data.error || '修改价格失败')
    }
  } catch (error) {
    console.error('修改价格失败:', error)
    alert('修改价格失败')
  } finally {
    isUpdatingPrice.value = false
  }
}

const fetchReports = async () => {
  if (!userStore.isAdmin) return
  
  const productId = route.params.id
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/admin/reports?product_id=${productId}`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    const data = await response.json()
    if (data.reports) {
      reports.value = data.reports
    }
  } catch (error) {
    console.error('获取举报信息失败:', error)
  }
}

const selectReport = (reportId) => {
  selectedReportId.value = reportId
  handleResult.value = ''
}

const handleReport = async (action) => {
  if (!selectedReportId.value || !handleResult.value.trim()) {
    alert('请选择举报并填写处理结果')
    return
  }
  
  isHandling.value = true
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/admin/reports/${selectedReportId.value}/handle`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({
        status: action,
        result: handleResult.value.trim()
      })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      reports.value = reports.value.filter(r => r.id !== selectedReportId.value)
      selectedReportId.value = null
      handleResult.value = ''
      alert('处理成功')
      
      if (action === 'approved') {
        product.value.status = 'removed'
      }
    } else {
      alert(data.error || '处理失败')
    }
  } catch (error) {
    console.error('处理举报失败:', error)
    alert('处理举报失败')
  } finally {
    isHandling.value = false
  }
}

const goBackToReports = () => {
  router.push('/reports')
}

const handleStatusChange = async (status) => {
  if (!confirm(status === 'inactive' ? '确定要下架该商品吗？' : '确定要上架该商品吗？')) {
    return
  }
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/admin/products/${route.params.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ status })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      product.value.status = status
      alert(status === 'inactive' ? '商品已下架' : '商品已上架')
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('操作失败:', error)
    alert('操作失败')
  }
}

const handleDeleteProduct = async () => {
  if (!confirm('确定要删除该商品吗？此操作不可恢复。')) {
    return
  }
  
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/admin/products/${route.params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      alert('商品已删除')
      router.push('/admin/products')
    } else {
      alert(data.error || '删除失败')
    }
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败')
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

onMounted(async () => {
  await fetchProduct()
  await fetchComments()
  
  if (userStore.isAdmin) {
    await fetchReports()
    if (isFromReport.value && reports.value.length > 0) {
      showReportPanel.value = true
      selectedReportId.value = reports.value[0].id
    }
  }
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
              v-if="isSeller()" 
              @click="openPriceModal" 
              class="offer-button edit-price-btn"
            >
              修改价格
            </button>
          </div>
          
          <p class="product-category">分类：{{ product.category }}</p>
          <p class="product-status" :class="{ 'inactive': product.status !== 'active' }">
            {{ product.status === 'active' ? '在售' : '已下架' }}
          </p>
          <p class="product-seller">卖家：{{ product.seller?.nickname || '未知' }}</p>
          <p class="product-date">发布时间：{{ formatDate(product.created_at) }}</p>
          <p class="product-description">{{ product.description }}</p>
          

          <div v-if="userStore.token && !isSeller()" class="product-actions">
            <button @click="contactSeller" class="contact-btn">联系卖家</button>
            <button @click="showReportModal = true" class="report-btn">举报商品</button>
          </div>
          
          <div v-if="userStore.isAdmin" class="admin-actions">
            <button @click="showReportPanel = !showReportPanel" class="admin-btn">
              {{ showReportPanel ? '隐藏举报处理' : '处理举报 (' + reports.length + ')' }}
            </button>
            <button v-if="product.status === 'active'" @click="handleStatusChange('inactive')" class="admin-btn warning">
              下架商品
            </button>
            <button @click="handleDeleteProduct" class="admin-btn danger">
              删除商品
            </button>
          </div>
        </div>
      </div>
      
      <!-- 管理员举报处理面板 -->
      <div v-if="userStore.isAdmin && showReportPanel" class="admin-report-panel">
        <div class="panel-header">
          <h3>举报处理</h3>
          <button @click="goBackToReports" class="back-btn">返回举报列表</button>
        </div>
        
        <div v-if="reports.length === 0" class="empty-reports">
          <p>该商品暂无举报记录</p>
        </div>
        
        <div v-else class="reports-list">
          <div 
            v-for="report in reports" 
            :key="report.id"
            :class="['report-item', { selected: selectedReportId === report.id }]"
            @click="selectReport(report.id)"
          >
            <div class="report-header">
              <span class="report-reason">{{ report.reason }}</span>
              <span :class="['report-status', report.status]">{{ report.status === 'pending' ? '待处理' : report.status === 'approved' ? '已通过' : '已驳回' }}</span>
            </div>
            <p class="report-desc">{{ report.description }}</p>
            <p class="report-meta">举报人：{{ report.reporter?.nickname }} | {{ formatDate(report.created_at) }}</p>
          </div>
        </div>
        
        <div v-if="selectedReportId" class="handle-section">
          <h4>处理举报</h4>
          <textarea 
            v-model="handleResult" 
            placeholder="请输入处理结果..."
            class="result-textarea"
          ></textarea>
          <div class="handle-buttons">
            <button @click="handleReport('approved')" :disabled="isHandling" class="handle-btn approve">
              {{ isHandling ? '处理中...' : '确认举报（下架商品）' }}
            </button>
            <button @click="handleReport('rejected')" :disabled="isHandling" class="handle-btn reject">
              {{ isHandling ? '处理中...' : '驳回举报' }}
            </button>
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

    <!-- 修改价格弹窗 -->
    <div v-if="showPriceModal" class="modal-overlay" @click.self="closePriceModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>修改价格</h3>
          <button @click="closePriceModal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <p class="original-price">当前价格：¥{{ product?.price.toFixed(2) }}</p>
          <div class="form-group">
            <label for="editPrice">新价格</label>
            <input 
              type="number" 
              id="editPrice" 
              v-model="editPrice" 
              placeholder="请输入新价格"
              step="0.01"
              min="0.01"
              class="offer-input"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closePriceModal" class="cancel-btn">取消</button>
          <button @click="updatePrice" :disabled="!editPrice || isUpdatingPrice" class="submit-offer-btn">
            {{ isUpdatingPrice ? '修改中...' : '确认修改' }}
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

.product-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #EDE9FE;
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

/* 管理员操作按钮 */
.admin-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #EDE9FE;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.admin-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.25s ease;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}

.admin-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
}

.admin-btn.warning {
  background: linear-gradient(135deg, #F59E0B, #D97706);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
}

.admin-btn.warning:hover {
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35);
}

.admin-btn.danger {
  background: linear-gradient(135deg, #EF4444, #DC2626);
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
}

.admin-btn.danger:hover {
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
}

/* 管理员举报处理面板 */
.admin-report-panel {
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(124, 58, 237, 0.08);
  padding: 24px;
  margin-top: 20px;
  border: 1px solid rgba(239, 68, 68, 0.1);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #EDE9FE;
}

.panel-header h3 {
  color: #EF4444;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.back-btn {
  padding: 8px 16px;
  background: #F3F4F6;
  color: #6B7280;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #E5E7EB;
}

.empty-reports {
  text-align: center;
  padding: 40px;
  color: #999;
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.report-item {
  padding: 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.report-item:hover {
  border-color: #EF4444;
  background: #FEF2F2;
}

.report-item.selected {
  border-color: #EF4444;
  background: #FEF2F2;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.report-reason {
  font-weight: 600;
  color: #EF4444;
  font-size: 14px;
}

.report-status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.report-status.pending {
  background: #FEF3C7;
  color: #D97706;
}

.report-status.approved {
  background: #D1FAE5;
  color: #059669;
}

.report-status.rejected {
  background: #FEE2E2;
  color: #DC2626;
}

.report-desc {
  color: #6B7280;
  font-size: 14px;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.report-meta {
  color: #9CA3AF;
  font-size: 12px;
  margin: 0;
}

.handle-section {
  background: #F9FAFB;
  border-radius: 12px;
  padding: 20px;
}

.handle-section h4 {
  color: #374151;
  margin: 0 0 15px 0;
  font-size: 16px;
}

.result-textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px 16px;
  border: 2px solid #E5E7EB;
  border-radius: 10px;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
  margin-bottom: 15px;
  outline: none;
  transition: all 0.25s ease;
}

.result-textarea:focus {
  border-color: #EF4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.handle-buttons {
  display: flex;
  gap: 12px;
}

.handle-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.handle-btn.approve {
  background: linear-gradient(135deg, #EF4444, #DC2626);
  color: white;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25);
}

.handle-btn.approve:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35);
}

.handle-btn.reject {
  background: linear-gradient(135deg, #6B7280, #4B5563);
  color: white;
  box-shadow: 0 4px 14px rgba(107, 114, 128, 0.25);
}

.handle-btn.reject:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(107, 114, 128, 0.35);
}

.handle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
</style>