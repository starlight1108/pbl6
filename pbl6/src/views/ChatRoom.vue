<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat.js'
import { useUserStore } from '../stores/user.js'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserStore()

const messageInput = ref(null)
const conversationId = parseInt(route.params.id)
const newMessage = ref('')
const messagesContainer = ref(null)
const typingTimeout = ref(null)

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
</style>
