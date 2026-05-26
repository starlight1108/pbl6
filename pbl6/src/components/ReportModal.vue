<script setup>
import { ref, onMounted, watch } from 'vue'
import { useReportStore } from '../stores/report.js'

const props = defineProps({
  visible: Boolean,
  productId: Number,
  productTitle: String
})

const emit = defineEmits(['close', 'success'])

const reportStore = useReportStore()

const selectedReason = ref('')
const description = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

watch(() => props.visible, async (newVal) => {
  if (newVal) {
    selectedReason.value = ''
    description.value = ''
    errorMessage.value = ''
    await reportStore.fetchReasons()
  }
})

const handleSubmit = async () => {
  errorMessage.value = ''
  
  if (!selectedReason.value) {
    errorMessage.value = '请选择举报原因'
    return
  }
  
  isSubmitting.value = true
  
  try {
    await reportStore.createReport(props.productId, selectedReason.value, description.value)
    emit('success')
    emit('close')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="report-modal-overlay" @click.self="handleClose">
    <div class="report-modal">
      <div class="modal-header">
        <h3>举报商品</h3>
        <button @click="handleClose" class="close-btn">×</button>
      </div>
      
      <div class="modal-body">
        <div class="product-info">
          <span class="product-title">{{ productTitle }}</span>
        </div>
        
        <div class="form-group">
          <label>举报原因 *</label>
          <div class="reason-list">
            <button 
              v-for="reason in reportStore.reasons" 
              :key="reason"
              :class="['reason-btn', { active: selectedReason === reason }]"
              @click="selectedReason = reason"
            >
              {{ reason }}
            </button>
          </div>
        </div>
        
        <div class="form-group">
          <label>详细描述（可选）</label>
          <textarea 
            v-model="description" 
            placeholder="请详细描述举报原因..."
            rows="4"
            class="description-input"
          ></textarea>
        </div>
        
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="handleClose" class="cancel-btn">取消</button>
        <button 
          @click="handleSubmit" 
          class="submit-btn"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? '提交中...' : '提交举报' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-modal-overlay {
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

.report-modal {
  background-color: white;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
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
  font-size: 18px;
}

.close-btn {
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

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.product-info {
  background-color: #f5f5f5;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.product-title {
  color: #333;
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.reason-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.reason-btn {
  padding: 8px 16px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.reason-btn:hover {
  background-color: #e8e8e8;
}

.reason-btn.active {
  background-color: #f44336;
  color: white;
  border-color: #f44336;
}

.description-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
}

.description-input:focus {
  outline: none;
  border-color: #f44336;
}

.error-message {
  color: #f44336;
  font-size: 14px;
  margin-bottom: 15px;
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
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.cancel-btn:hover {
  background-color: #e8e8e8;
}

.submit-btn {
  padding: 10px 20px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.submit-btn:hover {
  background-color: #d32f2f;
}

.submit-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>