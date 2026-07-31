import { defineStore } from 'pinia'
import request from '@/utils/request'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    unreadCount: 0,
    total: 0,
    pages: 0,
    currentPage: 1
  }),
  
  actions: {
    
    async fetchNotifications(page = 1, perPage = 20, unreadOnly = false) {
      try {
        const params = { page, per_page: perPage }
        if (unreadOnly) params.unread_only = true
        
        const data = await request.get('/notifications', { params })
        
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
        const data = await request.get('/notifications/unread-count')
        
        this.unreadCount = data.unread_count
        return data.unread_count
      } catch (error) {
        throw error
      }
    },
    
    async markAsRead(notificationId) {
      try {
        const data = await request.put(`/notifications/${notificationId}/read`)
        
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
        const data = await request.put('/notifications/read-all')
        
        this.notifications.forEach(n => n.is_read = true)
        this.unreadCount = 0
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async deleteNotification(notificationId) {
      try {
        const data = await request.delete(`/notifications/${notificationId}`)
        
        this.notifications = this.notifications.filter(n => n.id !== notificationId)
        
        return data
      } catch (error) {
        throw error
      }
    }
  }
})