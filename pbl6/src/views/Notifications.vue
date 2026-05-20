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

.mark-all-btn {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.mark-all-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
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
  background-color: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.empty-message {
  text-align: center;
  padding: 60px 20px;
  background-color: white;
  border-radius: 8px;
  color: #999;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notification-item {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  align-items: flex-start;
  gap: 15px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.notification-item:hover {
  background-color: #f9f9f9;
}

.notification-item.unread {
  border-left-color: #4CAF50;
  background-color: #f0f9f0;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.notification-type {
  font-size: 12px;
  font-weight: bold;
}

.notification-time {
  font-size: 12px;
  color: #999;
}

.notification-title {
  font-size: 16px;
  color: #333;
  margin: 0 0 5px 0;
}

.notification-text {
  font-size: 14px;
  color: #666;
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
  background-color: #4CAF50;
  border-radius: 50%;
}

.delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  background-color: transparent;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

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