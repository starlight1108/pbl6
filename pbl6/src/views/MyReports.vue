<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useReportStore } from '../stores/report.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const reportStore = useReportStore()
const userStore = useUserStore()

const filter = ref('all')
const isLoading = ref(false)

const filteredReports = computed(() => {
  if (filter.value === 'all') {
    return reportStore.reports
  }
  return reportStore.reports.filter(r => r.status === filter.value)
})

const getStatusLabel = (status) => {
  const labels = {
    'pending': '待处理',
    'approved': '已通过',
    'rejected': '已驳回'
  }
  return labels[status] || status
}

const getStatusColor = (status) => {
  const colors = {
    'pending': '#FF9800',
    'approved': '#4CAF50',
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
    await reportStore.fetchReports(page)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    isLoading.value = true
    try {
      await reportStore.fetchReports()
    } finally {
      isLoading.value = false
    }
  }
})
</script>

<template>
  <div class="reports-container">
    <div class="header">
      <h1>我的举报</h1>
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
          :class="['filter-btn', { active: filter === 'approved' }]" 
          @click="filter = 'approved'"
        >
          已通过
        </button>
        <button 
          :class="['filter-btn', { active: filter === 'rejected' }]" 
          @click="filter = 'rejected'"
        >
          已驳回
        </button>
      </div>
      
      <div v-if="isLoading" class="loading">
        加载中...
      </div>
      
      <div v-else-if="filteredReports.length === 0" class="empty-message">
        <p>暂无举报记录</p>
      </div>
      
      <div v-else class="report-list">
        <div 
          v-for="report in filteredReports" 
          :key="report.id" 
          class="report-item"
        >
          <div class="report-header">
            <span class="report-status" :style="{ color: getStatusColor(report.status) }">
              {{ getStatusLabel(report.status) }}
            </span>
            <span class="report-time">{{ formatTime(report.created_at) }}</span>
          </div>
          
          <div class="report-product">
            <div class="product-info">
              <h3 class="product-title">{{ report.product?.title || '商品已删除' }}</h3>
              <p class="product-price">¥{{ report.product?.price?.toFixed(2) || '-' }}</p>
            </div>
            <button 
              v-if="report.product" 
              @click="goToProduct(report.product_id)" 
              class="view-product-btn"
            >
              查看商品
            </button>
          </div>
          
          <div class="report-reason">
            <span class="reason-label">举报原因：</span>
            <span class="reason-text">{{ report.reason }}</span>
          </div>
          
          <div v-if="report.description" class="report-description">
            <span class="desc-label">详细描述：</span>
            <p class="desc-text">{{ report.description }}</p>
          </div>
          
          <div v-if="report.result" class="report-result">
            <span class="result-label">处理结果：</span>
            <p class="result-text">{{ report.result }}</p>
          </div>
        </div>
      </div>
      
      <div v-if="reportStore.pages > 1" class="pagination">
        <button 
          :disabled="reportStore.currentPage === 1"
          @click="changePage(reportStore.currentPage - 1)"
        >
          上一页
        </button>
        <span>第 {{ reportStore.currentPage }} / {{ reportStore.pages }} 页</span>
        <button 
          :disabled="reportStore.currentPage === reportStore.pages"
          @click="changePage(reportStore.currentPage + 1)"
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
  background-color: #f44336;
  color: white;
  border-color: #f44336;
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

.report-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.report-item {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.report-status {
  font-size: 14px;
  font-weight: bold;
}

.report-time {
  font-size: 12px;
  color: #999;
}

.report-product {
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
  margin: 0 0 5px 0;
}

.product-price {
  font-size: 14px;
  color: #f44336;
  margin: 0;
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

.report-reason {
  margin-bottom: 10px;
}

.reason-label {
  font-size: 14px;
  color: #666;
}

.reason-text {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.report-description {
  margin-bottom: 10px;
}

.desc-label {
  font-size: 14px;
  color: #666;
}

.desc-text {
  font-size: 14px;
  color: #333;
  margin: 5px 0 0 0;
  line-height: 1.5;
}

.report-result {
  padding: 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
  border-left: 3px solid #4CAF50;
}

.result-label {
  font-size: 14px;
  color: #666;
}

.result-text {
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
  background-color: #f44336;
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