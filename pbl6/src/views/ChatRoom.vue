<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat.js'
import { useUserStore } from '../stores/user.js'
import { useOrderStore } from '../stores/order.js'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserStore()
const orderStore = useOrderStore()

const messageInput = ref(null)
const conversationId = parseInt(route.params.id)
const newMessage = ref('')
const messagesContainer = ref(null)
const typingTimeout = ref(null)

// 交易弹窗状态
const showTradeModal = ref(false)
const tradePrice = ref('')
const isSubmittingTrade = ref(false)

const conversation = computed(() => {
  return chatStore.conversations.find(c => c.id === conversationId)
})

const otherUser = computed(() => {
  return conversation.value?.other_user || {}
})

const isTyping = computed(() => {
  return chatStore.typingUsers[conversationId] != null &&
    chatStore.typingUsers[conversationId] === otherUser.value?.id
})

const getAvatarUrl = (path) => {
  const baseUrl = 'http://127.0.0.1:5000'
  return path?.startsWith('/') ? baseUrl + path : baseUrl + '/static/images/default-avatar.png'
}

const isUserOnline = (userId) => chatStore.isUserOnline(userId)

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const sendMessage = async () => {
  const content = newMessage.value.trim()
  if (!content) return

  const originalContent = content
  newMessage.value = ''

  scrollToBottom()

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ content })
    })

    if (!response.ok) {
      const data = await response.json()
      newMessage.value = originalContent
      throw new Error(data.error || '发送失败')
    }

    const msgData = await response.json()
    if (chatStore.socket && chatStore.isConnected) {
      chatStore.socket.emit('broadcast_message', {
        conversation_id: conversationId,
        message: msgData.chat_message
      })
    }

    await chatStore.loadMessages(conversationId, 1)
    await chatStore.markAsRead(conversationId)
    await scrollToBottom()
  } catch (error) {
    alert(error.message || '发送失败，请重试')
  }
}

const handleInput = () => {
  chatStore.emitTyping(conversationId, true)
  if (typingTimeout.value) clearTimeout(typingTimeout.value)
  typingTimeout.value = setTimeout(() => {
    chatStore.emitTyping(conversationId, false)
  }, 2000)
}

const goBack = () => {
  router.push('/chat')
}

// 交易弹窗
const openTradeModal = () => {
  if (!conversation.value?.product_id) {
    alert('该会话没有关联的商品，无法发起交易')
    return
  }
  // 从 product_id 获取价格（如果没有价格信息，留空让用户输入）
  tradePrice.value = ''
  showTradeModal.value = true
}

const closeTradeModal = () => {
  showTradeModal.value = false
  tradePrice.value = ''
}

const submitTrade = async () => {
  if (!tradePrice.value || isNaN(tradePrice.value) || parseFloat(tradePrice.value) <= 0) {
    alert('请输入有效的交易金额')
    return
  }

  if (!conversation.value?.product_id) {
    alert('未关联商品，无法创建订单')
    return
  }

  isSubmittingTrade.value = true
  try {
    const finalPrice = parseFloat(tradePrice.value)
    const order = await orderStore.createOrder(
      conversation.value.product_id,
      finalPrice
    )

    closeTradeModal()

    // 发送系统消息到聊天室
    const systemMsg = `📋 交易已创建！订单 #${order.id}，金额 ¥${finalPrice.toFixed(2)}`
    await sendSystemMessage(systemMsg)

    // 弹出成功提示并提供跳转
    if (confirm(`交易创建成功！订单 #${order.id}\n金额 ¥${finalPrice.toFixed(2)}\n\n点击确定查看订单详情`)) {
      router.push(`/my-orders/${order.id}`)
    }
  } catch (error) {
    alert(error.message || '创建订单失败')
  } finally {
    isSubmittingTrade.value = false
  }
}

const sendSystemMessage = async (content) => {
  try {
    const response = await fetch(`http://127.0.0.1:5000/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ content })
    })

    if (response.ok) {
      const msgData = await response.json()
      if (chatStore.socket && chatStore.isConnected) {
        chatStore.socket.emit('broadcast_message', {
          conversation_id: conversationId,
          message: msgData.chat_message
        })
      }
      await chatStore.loadMessages(conversationId, 1)
      await scrollToBottom()
    }
  } catch (error) {
    console.error('发送系统消息失败:', error)
  }
}

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

onMounted(async () => {
  chatStore.connectWebSocket()
  await chatStore.loadConversations()
  await chatStore.loadMessages(conversationId)
  await chatStore.markAsRead(conversationId)
  await scrollToBottom()
  if (messageInput.value) {
    messageInput.value.focus()
  }
})

onUnmounted(() => {
  chatStore.disconnectWebSocket()
  if (typingTimeout.value) clearTimeout(typingTimeout.value)
})

watch(() => chatStore.currentMessages.length, () => {
  scrollToBottom()
})
</script>

<template>
  <div class="chat-room-container">
    <div class="header">
      <button @click="goBack" class="back-button">← 返回</button>
      <div class="header-user">
        <img :src="getAvatarUrl(otherUser?.avatar)" :alt="otherUser?.nickname" class="header-avatar">
        <div>
          <div class="header-nickname">{{ otherUser?.nickname || '用户' }}</div>
          <div class="header-status">
            <span v-if="isUserOnline(otherUser?.id)" class="online-text">在线</span>
            <span v-else class="offline-text">离线</span>
            <span v-if="isTyping" class="typing-text">正在输入...</span>
          </div>
        </div>
      </div>
      <div v-if="conversation?.product_title" class="product-info">
        关于：{{ conversation.product_title }}
      </div>
      <button
        v-if="conversation?.product_id"
        @click="openTradeModal"
        class="trade-button"
      >
        发起交易
      </button>
    </div>

    <div class="messages" ref="messagesContainer">
      <div v-if="chatStore.loading" class="loading">加载中...</div>
      <div v-else-if="chatStore.currentMessages.length === 0" class="empty-msg">
        开始聊天吧
      </div>
      <div
        v-for="msg in chatStore.currentMessages"
        :key="msg.id"
        :class="['message', msg.sender_id === userStore.id ? 'self' : 'other']"
      >
        <div class="message-content">
          <p>{{ msg.content }}</p>
          <span class="message-time">{{ formatTime(msg.created_at) }}</span>
        </div>
      </div>
    </div>

    <div class="input-bar">
      <textarea
        ref="messageInput"
        v-model="newMessage"
        @input="handleInput"
        @keydown="handleKeydown"
        placeholder="输入消息..."
        rows="1"
        class="message-input"
      ></textarea>
      <button @click="sendMessage" :disabled="!newMessage.trim()" class="send-button">
        发送
      </button>
    </div>
  </div>

  <!-- 交易弹窗 -->
  <div v-if="showTradeModal" class="modal-overlay" @click.self="closeTradeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>发起交易</h3>
        <button @click="closeTradeModal" class="close-btn">×</button>
      </div>
      <div class="modal-body">
        <div class="modal-product-info">
          <div class="modal-product-icon">📦</div>
          <div class="modal-product-detail">
            <p class="modal-product-title">{{ conversation?.product_title || '未知商品' }}</p>
            <p class="modal-product-label">与 {{ otherUser?.nickname || '对方' }} 的交易</p>
          </div>
        </div>
        <div class="form-group">
          <label for="tradePrice">交易金额（¥）</label>
          <input
            type="number"
            id="tradePrice"
            v-model="tradePrice"
            placeholder="请输入双方商定的金额"
            step="0.01"
            min="0.01"
            class="trade-input"
          >
        </div>
        <p class="form-tip">创建订单后，对方将收到通知。交易完成后可确认收货。</p>
      </div>
      <div class="modal-footer">
        <button @click="closeTradeModal" class="cancel-btn">取消</button>
        <button @click="submitTrade" :disabled="isSubmittingTrade" class="submit-trade-btn">
          {{ isSubmittingTrade ? '创建中...' : '创建订单' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-room-container {
  height: 100vh;
  background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  padding: 14px 20px;
  box-shadow: 0 1px 3px rgba(124, 58, 237, 0.08);
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(124, 58, 237, 0.1);
}

.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #EDE9FE;
  border: none;
  font-size: 16px;
  color: #7C3AED;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  transition: all 0.2s;
}

.back-button:hover {
  background: #7C3AED;
  color: white;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.header-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #A78BFA;
}

.header-nickname {
  font-weight: 600;
  color: #4C1D95;
  font-size: 15px;
}

.header-status {
  font-size: 12px;
  display: flex;
  gap: 8px;
}

.online-text { color: #22C55E; font-weight: 600; }
.offline-text { color: #9CA3AF; }
.typing-text { color: #7C3AED; font-style: italic; }

.product-info {
  font-size: 12px;
  color: #7C3AED;
  background: #EDE9FE;
  padding: 4px 12px;
  border-radius: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
  font-weight: 500;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading, .empty-msg {
  text-align: center;
  color: #7C3AED;
  opacity: 0.6;
  padding: 40px;
}

.message {
  display: flex;
  max-width: 70%;
}

.message.self { align-self: flex-end; }
.message.other { align-self: flex-start; }

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
}

.message.self .message-content {
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.25);
}

.message.other .message-content {
  background: white;
  color: #374151;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.message-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  display: block;
  margin-top: 4px;
  text-align: right;
}

.input-bar {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  padding: 12px 16px;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  border-top: 1px solid rgba(124, 58, 237, 0.1);
}

.message-input {
  flex: 1;
  border: 2px solid #EDE9FE;
  border-radius: 20px;
  padding: 10px 16px;
  font-size: 14px;
  resize: none;
  outline: none;
  min-height: 40px;
  max-height: 100px;
  background: #FAF5FF;
  transition: all 0.25s ease;
  font-family: inherit;
}

.message-input:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

.send-button {
  padding: 10px 24px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}

.send-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none;
}

/* 发起交易按钮 */
.trade-button {
  padding: 8px 18px;
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25);
  white-space: nowrap;
}

.trade-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35);
}

/* 弹窗覆盖层 */
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
  max-width: 420px;
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

.modal-header h3 {
  margin: 0;
  color: #4C1D95;
  font-size: 18px;
  font-weight: 600;
}

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

.modal-product-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #FAF5FF;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 1px solid rgba(124, 58, 237, 0.08);
}

.modal-product-icon {
  font-size: 28px;
}

.modal-product-detail { flex: 1; }

.modal-product-title {
  color: #4C1D95;
  font-weight: 600;
  font-size: 15px;
  margin: 0 0 2px 0;
}

.modal-product-label {
  color: #8B5CF6;
  font-size: 12px;
  margin: 0;
}

.form-group { margin-bottom: 14px; }

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #4C1D95;
  font-size: 14px;
  font-weight: 600;
}

.trade-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #EDE9FE;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  color: #7C3AED;
  background: #FAF5FF;
  outline: none;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.trade-input:focus {
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  background: white;
}

.form-tip {
  font-size: 12px;
  color: #9CA3AF;
  margin: 0;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #EDE9FE;
}

.cancel-btn,
.submit-trade-btn {
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

.submit-trade-btn {
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  box-shadow: 0 4px 14px rgba(34, 197, 94, 0.25);
}

.submit-trade-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35);
}

.submit-trade-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
</style>
