<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const notificationStore = useNotificationStore()
const userStore = useUserStore()

const showDropdown = ref(false)
let pollingInterval = null

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
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

const handleMarkAllRead = async () => {
  await notificationStore.markAllAsRead()
}

const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return date.toLocaleDateString()
}

const startPolling = () => {
  if (userStore.isLoggedIn) {
    notificationStore.fetchUnreadCount()
    pollingInterval = setInterval(() => {
      notificationStore.fetchUnreadCount()
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
      <span v-if="notificationStore.unreadCount > 0" class="badge">
        {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
      </span>
    </button>
    
    <div v-if="showDropdown" class="dropdown">
      <div class="dropdown-header">
        <span>通知</span>
        <button v-if="notificationStore.unreadCount > 0" @click="handleMarkAllRead" class="mark-read-btn">
          全部已读
        </button>
      </div>
      
      <div class="dropdown-content">
        <div v-if="notificationStore.notifications.length === 0" class="empty">
          暂无通知
        </div>
        
        <div v-else class="notification-items">
          <div 
            v-for="notification in notificationStore.notifications.slice(0, 5)" 
            :key="notification.id"
            :class="['notification-item', { unread: !notification.is_read }]"
          >
            <div class="item-content">
              <div class="item-title">{{ notification.title }}</div>
              <div class="item-time">{{ formatTime(notification.created_at) }}</div>
            </div>
            <span v-if="!notification.is_read" class="unread-dot"></span>
          </div>
        </div>
      </div>
      
      <div class="dropdown-footer">
        <button @click="goToNotifications" class="view-all-btn">
          查看全部通知
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
  width: 320px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 10px;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #eee;
  font-weight: bold;
}

.mark-read-btn {
  background: none;
  border: none;
  color: #4CAF50;
  cursor: pointer;
  font-size: 12px;
}

.dropdown-content {
  max-height: 300px;
  overflow-y: auto;
}

.empty {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.notification-items {
  padding: 5px 0;
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f5f5f5;
}

.notification-item.unread {
  background-color: #f0f9f0;
}

.item-content {
  flex: 1;
}

.item-title {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
}

.view-all-btn:hover {
  background-color: #45a049;
}
</style>