<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const notificationStore = useNotificationStore()
const userStore = useUserStore()

const filter = ref('all')

const filteredNotifications = computed(() => {
  if (filter.value === 'unread') {
    return notificationStore.notifications.filter(n => !n.is_read)
  }
  return notificationStore.notifications
})

const getTypeLabel = (type) => {
  const labels = {
    'message': '新消息',
    'order': '订单通知',
    'system': '系统通知',
    'comment': '评论通知',
    'favorite': '收藏通知'
  }
  return labels[type] || '通知'
}

const getTypeColor = (type) => {
  const colors = {
    'message': '#2196F3',
    'order': '#FF9800',
    'system': '#9C27B0',
    'comment': '#4CAF50',
    'favorite': '#E91E63'
  }
  return colors[type] || '#666'
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString()
}

const handleNotificationClick = async (notification) => {
  if (!notification.is_read) {
    await notificationStore.markAsRead(notification.id)
  }
  
  if (notification.related_type === 'product' && notification.related_id) {
    router.push(`/products/${notification.related_id}`)
  }
}

const handleMarkAllRead = async () => {
  await notificationStore.markAllAsRead()
}

const handleDelete = async (notificationId) => {
  if (confirm('确定要删除这条通知吗？')) {
    await notificationStore.deleteNotification(notificationId)
  }
}

const changePage = async (page) => {
  await notificationStore.fetchNotifications(page)
}

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await notificationStore.fetchNotifications()
  }
})
</script>

<template>
  <div class="notifications-container">
    <div class="header">
      <h1>消息通知</h1>
      <div class="header-actions">
        <button @click="handleMarkAllRead" class="mark-all-btn" :disabled="notificationStore.unreadCount === 0">
          全部已读
        </button>
      </div>
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
          :class="['filter-btn', { active: filter === 'unread' }]" 
          @click="filter = 'unread'"
        >
          未读 ({{ notificationStore.unreadCount }})
        </button>
      </div>
      
      <div v-if="filteredNotifications.length === 0" class="empty-message">
        <p>暂无通知</p>
      </div>
      
      <div v-else class="notification-list">
        <div 
          v-for="notification in filteredNotifications" 
          :key="notification.id" 
          :class="['notification-item', { unread: !notification.is_read }]"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon" :style="{ backgroundColor: getTypeColor(notification.type) }">
            {{ getTypeLabel(notification.type).charAt(0) }}
          </div>
          <div class="notification-content">
            <div class="notification-header">
              <span class="notification-type" :style="{ color: getTypeColor(notification.type) }">
                {{ getTypeLabel(notification.type) }}
              </span>
              <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
            </div>
            <h3 class="notification-title">{{ notification.title }}</h3>
            <p v-if="notification.content" class="notification-text">{{ notification.content }}</p>
          </div>
          <div class="notification-actions">
            <span v-if="!notification.is_read" class="unread-dot"></span>
            <button @click.stop="handleDelete(notification.id)" class="delete-btn">×</button>
          </div>
        </div>
      </div>
      
      <div v-if="notificationStore.pages > 1" class="pagination">
        <button 
          :disabled="notificationStore.currentPage === 1"
          @click="changePage(notificationStore.currentPage - 1)"
        >
          上一页
        </button>
        <span>第 {{ notificationStore.currentPage }} / {{ notificationStore.pages }} 页</span>
        <button 
          :disabled="notificationStore.currentPage === notificationStore.pages"
          @click="changePage(notificationStore.currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notifications-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%);
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
  border-bottom: 1px solid rgba(124, 58, 237, 0.1);
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

.mark-all-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}

.mark-all-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
}

.mark-all-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

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
  padding: 8px 20px;
  background: white;
  border: 2px solid #EDE9FE;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #7C3AED;
  transition: all 0.25s ease;
}

.filter-btn:hover { background: #FAF5FF; border-color: #7C3AED; }

.filter-btn.active {
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  border-color: #7C3AED;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.25);
}

.empty-message {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 18px;
  color: #7C3AED;
  opacity: 0.6;
  border: 2px dashed #EDE9FE;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-item {
  background: white;
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid rgba(124, 58, 237, 0.06);
  border-left: 4px solid transparent;
}

.notification-item:hover {
  border-color: rgba(124, 58, 237, 0.15);
  transform: translateX(3px);
}

.notification-item.unread {
  border-left-color: #7C3AED;
  background: #FAF5FF;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  flex-shrink: 0;
}

.notification-content { flex: 1; min-width: 0; }

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.notification-type { font-size: 12px; font-weight: 700; }
.notification-time { font-size: 12px; color: #A78BFA; }

.notification-title {
  font-size: 15px;
  color: #1F2937;
  margin: 0 0 4px 0;
  font-weight: 600;
}

.notification-text {
  font-size: 13px;
  color: #6B7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.unread-dot {
  width: 10px;
  height: 10px;
  background: #7C3AED;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(124, 58, 237, 0.4);
}

.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: #FEE2E2;
  color: #EF4444;
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.delete-btn:hover { background: #EF4444; color: white; }

.delete-btn:hover {
  background-color: #f44336;
  color: white;
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