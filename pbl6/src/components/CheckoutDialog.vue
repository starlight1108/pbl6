<script setup>
import { ref } from 'vue'
import { useOrderStore } from '../stores/order.js'

const props = defineProps({
  productId: { type: Number, required: true },
  productTitle: { type: String, default: '' },
  productPrice: { type: Number, required: true },
  sellerNickname: { type: String, default: '' }
})

const emit = defineEmits(['close', 'success'])

const orderStore = useOrderStore()

const transactionType = ref('online')
const message = ref('')
const isSubmitting = ref(false)

const handleClose = () => emit('close')

const handleSubmit = async () => {
  isSubmitting.value = true
  try {
    const order = await orderStore.createOrder(
      props.productId,
      props.productPrice,
      transactionType.value
    )
    emit('success', order)
    emit('close')
  } catch (error) {
    alert(error.message || '创建订单失败')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>确认下单</h3>
        <button @click="handleClose" class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <!-- 商品信息 -->
        <div class="product-section">
          <div class="product-icon">📦</div>
          <div class="product-detail">
            <p class="product-title">{{ productTitle }}</p>
            <p class="product-seller">卖家：{{ sellerNickname }}</p>
          </div>
          <p class="product-price">¥{{ productPrice?.toFixed(2) }}</p>
        </div>

        <!-- 交易方式选择 -->
        <div class="section-label">选择交易方式</div>
        <div class="trade-type-options">
          <label
            :class="['trade-type-card', { active: transactionType === 'online' }]"
            @click="transactionType = 'online'"
          >
            <div class="radio-circle">
              <span v-if="transactionType === 'online'" class="radio-dot"></span>
            </div>
            <div class="trade-type-info">
              <span class="trade-type-name">🔒 线上交易（推荐）</span>
              <span class="trade-type-desc">平台担保资金安全，支持确认收货流程</span>
            </div>
          </label>
          <label
            :class="['trade-type-card', { active: transactionType === 'offline' }]"
            @click="transactionType = 'offline'"
          >
            <div class="radio-circle">
              <span v-if="transactionType === 'offline'" class="radio-dot"></span>
            </div>
            <div class="trade-type-info">
              <span class="trade-type-name">🤝 线下交易</span>
              <span class="trade-type-desc">自行联系卖家当面交易，平台仅记录订单</span>
            </div>
          </label>
        </div>

        <!-- 留言 -->
        <div class="section-label">留言（选填）</div>
        <textarea
          v-model="message"
          placeholder="给卖家留言..."
          maxlength="200"
          class="message-input"
        ></textarea>
      </div>

      <div class="modal-footer">
        <button @click="handleClose" class="cancel-btn">取消</button>
        <button
          @click="handleSubmit"
          :disabled="isSubmitting"
          class="submit-btn"
        >
          {{ isSubmitting ? '提交中...' : '提交订单' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
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

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px 24px;
}

.product-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f6ff;
  border-radius: 12px;
  margin-bottom: 20px;
}

.product-icon {
  font-size: 32px;
}

.product-detail {
  flex: 1;
  min-width: 0;
}

.product-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-seller {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.product-price {
  font-size: 18px;
  font-weight: 700;
  color: #7c3aed;
  margin: 0;
  white-space: nowrap;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.trade-type-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.trade-type-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.trade-type-card:hover {
  border-color: #c4b5fd;
  background: #faf5ff;
}

.trade-type-card.active {
  border-color: #7c3aed;
  background: #f5f3ff;
}

.radio-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.trade-type-card.active .radio-circle {
  border-color: #7c3aed;
}

.radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #7c3aed;
}

.trade-type-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.trade-type-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.trade-type-desc {
  font-size: 12px;
  color: #888;
}

.message-input {
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  color: #333;
  resize: none;
  min-height: 80px;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
}

.message-input:focus {
  outline: none;
  border-color: #7c3aed;
}

.message-input::placeholder {
  color: #bbb;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 0 24px 20px;
}

.cancel-btn,
.submit-btn {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f3f4f6;
  color: #666;
}

.cancel-btn:hover {
  background: #e5e7eb;
}

.submit-btn {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: white;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
