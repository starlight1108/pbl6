<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification.js'
import { useChatStore } from '../stores/chat.js'
import { useUserStore } from '../stores/user.js'
import { useReportStore } from '../stores/report.js'

const router = useRouter()
const notificationStore = useNotificationStore()
const chatStore = useChatStore()
const userStore = useUserStore()
const reportStore = useReportStore()

const showDropdown = ref(false)
const activeTab = ref('notification')
let pollingInterval = null

const reportNotifications = computed(() => {
  return notificationStore.notifications.filter(n => n.type === 'report')
})

const reportUnreadCount = computed(() => {
  return reportNotifications.value.filter(n => !n.is_read).length
})

const totalUnread = computed(() => {
  return (notificationStore.unreadCount || 0) + (chatStore.totalUnreadCount || 0)
})

const toggleDropdown = async () => {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    activeTab.value = 'notification'
    if (notificationStore.notifications.length === 0) {
      await notificationStore.fetchNotifications()
    }
  }
}

const handleClickOutside = (event) => {
  const el = document.querySelector('.notification-bell')
  if (el && !el.contains(event.target)) {
    showDropdown.value = false
  }
}

const goToNotifications = () => {
  router.push('/notifications')
  showDropdown.value = false
}

const goToChat = () => {
  router.push('/chat')
  showDropdown.value = false
}

const goToReports = () => {
  router.push('/reports')
  showDropdown.value = false
}

const handleReportClick = async (notification) => {
  try {
    if (!notification.is_read) {
      await notificationStore.markAsRead(notification.id)
    }
    
    if (notification.related_id) {
      if (notification.related_type === 'product') {
        router.push(`/products/${notification.related_id}?fromReport=true`)
      } else if (notification.related_type === 'report') {
        router.push('/reports')
      } else {
        router.push(`/products/${notification.related_id}?fromReport=true`)
      }
    } else {
      router.push('/reports')
    }
  } catch (error) {
    console.error('处理举报通知点击失败:', error)
    router.push('/reports')
  } finally {
    showDropdown.value = false
  }
}

const handleNotificationClick = async (notification) => {
  if (!notification.is_read) {
    await notificationStore.markAsRead(notification.id)
  }
  router.push('/notifications')
  showDropdown.value = false
}

const handleMarkAllRead = async () => {
  await notificationStore.markAllAsRead()
}

const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

const startPolling = () => {
  if (userStore.isLoggedIn) {
    notificationStore.fetchNotifications()
    chatStore.loadConversations()
    pollingInterval = setInterval(() => {
      notificationStore.fetchUnreadCount()
      chatStore.loadConversations()
    }, 30000)
  }
}

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    startPolling()
  }
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  stopPolling()
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="notification-bell" v-if="userStore.isLoggedIn">
    <button @click="toggleDropdown" class="bell-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <span v-if="totalUnread > 0" class="badge">
        {{ totalUnread > 99 ? '99+' : totalUnread }}
      </span>
    </button>
    
    <div v-if="showDropdown" class="dropdown">
      <div class="dropdown-tabs">
        <button 
          :class="['tab', { active: activeTab === 'notification' }]" 
          @click="activeTab = 'notification'"
        >
          通知
          <span v-if="notificationStore.unreadCount > 0" class="tab-badge">{{ notificationStore.unreadCount }}</span>
        </button>
        <button 
          :class="['tab', { active: activeTab === 'chat' }]" 
          @click="activeTab = 'chat'"
        >
          消息
          <span v-if="chatStore.totalUnreadCount > 0" class="tab-badge">{{ chatStore.totalUnreadCount }}</span>
        </button>
        <button 
          v-if="userStore.isAdmin"
          :class="['tab', { active: activeTab === 'report' }]" 
          @click="activeTab = 'report'"
        >
          举报
          <span v-if="reportUnreadCount > 0" class="tab-badge">{{ reportUnreadCount }}</span>
        </button>
      </div>
      
      <div class="dropdown-content">
        <div v-if="activeTab === 'notification'">
          <div v-if="notificationStore.notifications.length === 0" class="empty">
            暂无通知
          </div>
          <div v-else class="items">
            <div 
              v-for="notification in notificationStore.notifications.slice(0, 5)" 
              :key="notification.id"
              :class="['item', { unread: !notification.is_read }]"
              @click="handleNotificationClick(notification)"
            >
              <div class="item-content">
                <div class="item-title">{{ notification.title }}</div>
                <div class="item-time">{{ formatTime(notification.created_at) }}</div>
              </div>
              <span v-if="!notification.is_read" class="unread-dot"></span>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'chat'">
          <div v-if="chatStore.conversations.length === 0" class="empty">
            暂无消息
          </div>
          <div v-else class="items">
            <div 
              v-for="conv in chatStore.conversations.slice(0, 5)" 
              :key="conv.id"
              class="item chat-item"
              @click="goToChat"
            >
              <div class="chat-item-avatar">
                <img :src="conv.other_user?.avatar?.startsWith('/') ? 'http://127.0.0.1:5000' + conv.other_user.avatar : 'http://127.0.0.1:5000/static/images/default-avatar.png'" :alt="conv.other_user?.nickname" class="mini-avatar">
              </div>
              <div class="item-content">
                <div class="item-title">{{ conv.other_user?.nickname || '用户' }}</div>
                <div class="item-subtitle">{{ conv.last_message || '暂无消息' }}</div>
              </div>
              <span v-if="conv.unread_count > 0" class="unread-dot"></span>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'report'">
          <div v-if="reportNotifications.length === 0" class="empty">
            暂无举报通知
          </div>
          <div v-else class="items">
            <div 
              v-for="notification in reportNotifications.slice(0, 5)" 
              :key="notification.id"
              :class="['item', { unread: !notification.is_read }]"
              @click="handleReportClick(notification)"
            >
              <div class="item-content">
                <div class="item-title">
                  <span class="report-icon">⚠</span>
                  {{ notification.title }}
                </div>
                <div class="item-subtitle">{{ notification.content }}</div>
                <div class="item-time">{{ formatTime(notification.created_at) }}</div>
              </div>
              <span v-if="!notification.is_read" class="unread-dot"></span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dropdown-footer">
        <button v-if="activeTab === 'notification'" @click="goToNotifications" class="view-all-btn">
          查看全部通知
        </button>
        <button v-if="activeTab === 'chat'" @click="goToChat" class="view-all-btn">
          查看全部消息
        </button>
        <button v-if="activeTab === 'report'" @click="goToReports" class="view-all-btn">
          查看全部举报
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notification-bell {
  position: relative;
}

.bell-button {
  background: none;
  border: none;
  cursor: pointer;
  position: relative;
  padding: 8px;
  color: #333;
}

.bell-button:hover {
  color: #4CAF50;
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  background-color: #f44336;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 340px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 10px;
}

.dropdown-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
}

.tab {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #999;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}

.tab.active {
  color: #4CAF50;
  font-weight: 600;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background-color: #4CAF50;
  border-radius: 1px;
}

.tab-badge {
  background-color: #f44336;
  color: white;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 8px;
  min-width: 16px;
  text-align: center;
}

.dropdown-content {
  max-height: 320px;
  overflow-y: auto;
}

.empty {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.items {
  padding: 5px 0;
}

.item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.item:hover {
  background-color: #f5f5f5;
}

.item.unread {
  background-color: #f0f9f0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  color: #333;
  margin-bottom: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.report-icon {
  color: #f44336;
  font-size: 16px;
}

.item-subtitle {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.item-time {
  font-size: 12px;
  color: #999;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background-color: #4CAF50;
  border-radius: 50%;
  margin-left: 10px;
  flex-shrink: 0;
}

.chat-item-avatar {
  margin-right: 10px;
  flex-shrink: 0;
}

.mini-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.dropdown-footer {
  padding: 10px 15px;
  border-top: 1px solid #eee;
}

.view-all-btn {
  width: 100%;
  padding: 8px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.view-all-btn:hover {
  background-color: #45a049;
}
</style>