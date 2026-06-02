<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserStore()

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
  if (diff < 86400000) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

const openConversation = (conv) => {
  router.push(`/chat/${conv.id}`)
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  chatStore.loadConversations()
  chatStore.connectWebSocket()
})

onUnmounted(() => {
  chatStore.disconnectWebSocket()
})
</script>

<template>
  <div class="chat-list-container">
    <div class="header">
      <button @click="goBack" class="back-button">← 返回</button>
      <h1>消息</h1>
      <div class="header-right">
        <span v-if="chatStore.isConnected" class="status-dot online"></span>
        <span v-else class="status-dot offline"></span>
      </div>
    </div>

    <div class="content">
      <div v-if="chatStore.conversations.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <p>暂无消息</p>
        <p class="empty-hint">在商品详情页点击「联系卖家」开始聊天</p>
      </div>

      <div v-else class="conversation-list">
        <div
          v-for="conv in chatStore.conversations"
          :key="conv.id"
          class="conversation-item"
          @click="openConversation(conv)"
        >
          <div class="avatar-wrapper">
            <img :src="getAvatarUrl(conv.other_user?.avatar)" :alt="conv.other_user?.nickname" class="avatar">
            <span v-if="isUserOnline(conv.other_user?.id)" class="online-badge"></span>
          </div>
          <div class="conversation-info">
            <div class="conversation-top">
              <span class="nickname">{{ conv.other_user?.nickname || '用户' }}</span>
              <span class="time">{{ formatTime(conv.last_message_at) }}</span>
            </div>
            <div class="conversation-bottom">
              <span class="last-message">{{ conv.last_message || '暂无消息' }}</span>
              <span v-if="conv.unread_count > 0" class="unread-badge">{{ conv.unread_count > 99 ? '99+' : conv.unread_count }}</span>
            </div>
            <div v-if="conv.product_title" class="product-ref">
              关于：{{ conv.product_title }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-list-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}

.header {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  padding: 16px 24px;
  box-shadow: 0 1px 3px rgba(124, 58, 237, 0.08);
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid rgba(124, 58, 237, 0.1);
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #EDE9FE;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #7C3AED;
  cursor: pointer;
  padding: 8px 14px;
  border-radius: 10px;
  transition: all 0.2s;
}

.back-button:hover {
  background: #7C3AED;
  color: white;
}

.header h1 {
  flex: 1;
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.4);
}

.status-dot.online { background: #22C55E; }
.status-dot.offline { background: #D1D5DB; box-shadow: none; }

.content { flex: 1; padding: 0; }

.empty-state {
  text-align: center;
  padding: 100px 20px;
  color: #7C3AED;
  opacity: 0.6;
}

.empty-icon {
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 13px;
  color: #bbb;
  margin-top: 8px;
}

.conversation-list {
  background-color: white;
}

.conversation-item {
  display: flex;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.conversation-item:hover {
  background-color: #f9f9f9;
}

.avatar-wrapper {
  position: relative;
  margin-right: 12px;
  flex-shrink: 0;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.online-badge {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background-color: #4CAF50;
  border: 2px solid white;
  border-radius: 50%;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.nickname {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.time {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  margin-left: 8px;
}

.conversation-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.last-message {
  font-size: 14px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.unread-badge {
  background-color: #f44336;
  color: white;
  font-size: 11px;
  font-weight: bold;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  margin-left: 8px;
  flex-shrink: 0;
}

.product-ref {
  font-size: 12px;
  color: #4CAF50;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
