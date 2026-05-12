import { defineStore } from 'pinia'
import { useUserStore } from './user.js'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    total: 0,
    pages: 0,
    currentPage: 1
  }),
  
  actions: {
    getAuthHeaders() {
      const userStore = useUserStore()
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      }
    },
    
    async fetchNotifications(page = 1, perPage = 20, unreadOnly = false) {
      try {
        let url = `${API_BASE_URL}/notifications?page=${page}&per_page=${perPage}`
        if (unreadOnly) url += `&unread_only=true`
        
        const response = await fetch(url, {
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '获取通知失败')
        }
        
        this.notifications = data.notifications
        this.total = data.total
        this.unreadCount = data.unread_count
        this.pages = data.pages
        this.currentPage = data.current_page
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async fetchUnreadCount() {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '获取未读数量失败')
        }
        
        this.unreadCount = data.unread_count
        return data.unread_count
      } catch (error) {
        throw error
      }
    },
    
    async markAsRead(notificationId) {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
          method: 'PUT',
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '标记已读失败')
        }
        
        const index = this.notifications.findIndex(n => n.id === notificationId)
        if (index !== -1) {
          this.notifications[index].is_read = true
        }
        this.unreadCount = Math.max(0, this.unreadCount - 1)
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async markAllAsRead() {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
          method: 'PUT',
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '全部标记已读失败')
        }
        
        this.notifications.forEach(n => n.is_read = true)
        this.unreadCount = 0
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async deleteNotification(notificationId) {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '删除通知失败')
        }
        
        this.notifications = this.notifications.filter(n => n.id !== notificationId)
        
        return data
      } catch (error) {
        throw error
      }
    }
  }
})