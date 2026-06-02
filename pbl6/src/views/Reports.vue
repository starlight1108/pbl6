<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useReportStore } from '../stores/report.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const reportStore = useReportStore()
const userStore = useUserStore()

const isLoading = ref(true)
const filterStatus = ref('')

const fetchReports = async () => {
  try {
    isLoading.value = true
    await reportStore.fetchReports(1, 20, filterStatus.value || null)
  } catch (error) {
    console.error('获取举报列表失败:', error)
    alert(error.message || '获取举报列表失败')
  } finally {
    isLoading.value = false
  }
}

const handleFilterChange = async () => {
  await fetchReports()
}

const goToProduct = (productId) => {
  router.push(`/products/${productId}`)
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': '待处理',
    'approved': '已通过',
    'rejected': '已驳回'
  }
  return statusMap[status] || status
}

const getStatusClass = (status) => {
  const classMap = {
    'pending': 'status-pending',
    'approved': 'status-approved',
    'rejected': 'status-rejected'
  }
  return classMap[status] || ''
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

onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  fetchReports()
})
</script>

<template>
  <div class="reports-container">
    <div class="header">
      <h1>我的举报</h1>
      <button @click="router.push('/')" class="back-button">返回首页</button>
    </div>

    <div v-if="isLoading" class="loading">
      加载中...
    </div>

    <div v-else class="content">
      <div class="filter-bar">
        <select v-model="filterStatus" @change="handleFilterChange" class="filter-select">
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="approved">已通过</option>
          <option value="rejected">已驳回</option>
        </select>
      </div>

      <div v-if="reportStore.reports.length === 0" class="empty-message">
        <p>暂无举报记录</p>
      </div>

      <div v-else class="reports-list">
        <div 
          v-for="report in reportStore.reports" 
          :key="report.id"
          class="report-item"
        >
          <div class="report-header">
            <div class="product-info" @click="goToProduct(report.product_id)">
              <img 
                :src="'http://127.0.0.1:5000' + (report.product?.image || '/static/images/default-product.png')" 
                :alt="report.product?.title"
                class="product-image"
              >
              <div class="product-details">
                <h3 class="product-title">{{ report.product?.title || '商品已删除' }}</h3>
                <p class="report-reason">举报原因：{{ report.reason }}</p>
              </div>
            </div>
            <div :class="['status-badge', getStatusClass(report.status)]">
              {{ getStatusText(report.status) }}
            </div>
          </div>

          <div class="report-body">
            <div class="report-meta">
              <p class="report-time">举报时间：{{ formatDate(report.created_at) }}</p>
              <p v-if="report.description" class="report-description">
                详细说明：{{ report.description }}
              </p>
            </div>

            <div v-if="report.status !== 'pending' && report.result" class="report-result">
              <h4>处理结果</h4>
              <p>{{ report.result }}</p>
              <p v-if="report.handled_at" class="handled-time">
                处理时间：{{ formatDate(report.handled_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="reportStore.pages > 1" class="pagination">
        <button 
          :disabled="reportStore.currentPage === 1"
          @click="reportStore.fetchReports(reportStore.currentPage - 1, 20, filterStatus.value || null)"
        >
          上一页
        </button>
        <span>第 {{ reportStore.currentPage }} / {{ reportStore.pages }} 页</span>
        <button 
          :disabled="reportStore.currentPage === reportStore.pages"
          @click="reportStore.fetchReports(reportStore.currentPage + 1, 20, filterStatus.value || null)"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reports-container {
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

.content {
  max-width: 1200px;
  margin: 0 auto;
}

.filter-bar {
  margin-bottom: 20px;
}

.filter-select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
}

.empty-message {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 16px;
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.report-item {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.product-info {
  display: flex;
  gap: 15px;
  cursor: pointer;
  flex: 1;
}

.product-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
}

.product-details {
  flex: 1;
}

.product-title {
  color: #333;
  font-size: 18px;
  margin: 0 0 8px 0;
}

.report-reason {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.status-pending {
  background-color: #FFF3E0;
  color: #F57C00;
}

.status-approved {
  background-color: #E8F5E9;
  color: #4CAF50;
}

.status-rejected {
  background-color: #FFEBEE;
  color: #F44336;
}

.report-body {
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.report-meta {
  margin-bottom: 15px;
}

.report-time {
  color: #999;
  font-size: 14px;
  margin: 0 0 8px 0;
}

.report-description {
  color: #666;
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
}

.report-result {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
}

.report-result h4 {
  color: #333;
  font-size: 16px;
  margin: 0 0 10px 0;
}

.report-result p {
  color: #666;
  font-size: 14px;
  margin: 0 0 8px 0;
  line-height: 1.5;
}

.handled-time {
  color: #999;
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
}

.pagination button {
  padding: 10px 20px;
  background-color: #4CAF50;
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