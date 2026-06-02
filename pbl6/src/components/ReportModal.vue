<script setup>
import { ref, onMounted } from 'vue'
import { useReportStore } from '../stores/report.js'

const props = defineProps({
  productId: {
    type: Number,
    required: true
  },
  productTitle: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'success'])

const reportStore = useReportStore()

const reasons = ref([])
const selectedReason = ref('')
const description = ref('')
const isSubmitting = ref(false)
const isLoading = ref(true)

const fetchReasons = async () => {
  try {
    isLoading.value = true
    const data = await reportStore.fetchReasons()
    reasons.value = data
  } catch (error) {
    console.error('获取举报原因失败:', error)
    alert('获取举报原因失败')
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async () => {
  if (!selectedReason.value) {
    alert('请选择举报原因')
    return
  }

  if (!confirm(`确定要举报该商品吗？\n商品：${props.productTitle}`)) {
    return
  }

  isSubmitting.value = true

  try {
    await reportStore.createReport(props.productId, selectedReason.value, description.value)
    alert('举报成功，我们会尽快处理')
    emit('success')
    emit('close')
  } catch (error) {
    alert(error.message || '举报失败')
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('close')
}

onMounted(() => {
  fetchReasons()
})
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>举报商品</h3>
        <button @click="handleClose" class="close-btn">&times;</button>
      </div>

      <div v-if="isLoading" class="loading">
        加载中...
      </div>

      <div v-else class="modal-body">
        <div class="product-info" v-if="productTitle">
          <p><strong>商品：</strong>{{ productTitle }}</p>
        </div>

        <div class="form-group">
          <label>举报原因 <span class="required">*</span></label>
          <select v-model="selectedReason" class="reason-select">
            <option value="">请选择举报原因</option>
            <option v-for="reason in reasons" :key="reason" :value="reason">
              {{ reason }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>详细说明</label>
          <textarea 
            v-model="description" 
            placeholder="请详细描述举报原因（选填）"
            rows="4"
            maxlength="500"
            class="description-input"
          ></textarea>
          <p class="char-count">{{ description.length }}/500</p>
        </div>

        <div class="modal-footer">
          <button @click="handleClose" class="cancel-btn">取消</button>
          <button 
            @click="handleSubmit" 
            :disabled="isSubmitting || !selectedReason"
            class="submit-btn"
          >
            {{ isSubmitting ? '提交中...' : '提交举报' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.loading {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.product-info {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.product-info p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.required {
  color: #f44336;
}

.reason-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
}

.reason-select:focus {
  outline: none;
  border-color: #4CAF50;
}

.description-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.description-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
}

.cancel-btn,
.submit-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background-color: #e0e0e0;
}

.submit-btn {
  background-color: #f44336;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background-color: #d32f2f;
}

.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>