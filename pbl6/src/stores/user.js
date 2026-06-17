import { defineStore } from 'pinia'
import { useChatStore } from './chat.js'
import { useNotificationStore } from './notification.js'
import { useProductStore } from './product.js'
import { useOrderStore } from './order.js'
import { useReportStore } from './report.js'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: false,
    id: null,
    email: '',
    nickname: '',
    avatar: '',
    token: '',
    userId: null,
    isAdmin: false
  }),
  
  actions: {
    async login(email, password) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '登录失败')
        }
        
        this.isLoggedIn = true
        this.id = data.user.id
        this.email = data.user.email
        this.nickname = data.user.nickname
        this.avatar = data.user.avatar
        this.token = data.access_token
        this.userId = data.user.id
        this.isAdmin = data.user.isAdmin || false
        
        localStorage.setItem('user', JSON.stringify({
          isLoggedIn: true,
          id: data.user.id,
          email: data.user.email,
          nickname: data.user.nickname,
          avatar: data.user.avatar,
          token: data.access_token,
          userId: data.user.id,
          isAdmin: data.user.isAdmin || false
        }))
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async register(email, password, nickname) {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password, nickname })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '注册失败')
        }
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    logout() {
      this.isLoggedIn = false
      this.id = null
      this.email = ''
      this.nickname = ''
      this.avatar = ''
      this.token = ''
      this.isAdmin = false
      localStorage.removeItem('user')

      // 清理其他 Pinia Store 状态
      useChatStore().$reset()
      useNotificationStore().$reset()
      useProductStore().$reset()
      useOrderStore().$reset()
      useReportStore().$reset()
    },
    
    async refreshUserInfo() {
      if (!this.token) return
      if (this.avatar) return
      
      try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          this.id = data.user.id
          this.nickname = data.user.nickname
          this.avatar = data.user.avatar
          this.isAdmin = data.user.isAdmin || false
          
          const userData = localStorage.getItem('user')
          if (userData) {
            const user = JSON.parse(userData)
            user.id = data.user.id
            user.nickname = data.user.nickname
            user.avatar = data.user.avatar
            user.isAdmin = data.user.isAdmin || false
            localStorage.setItem('user', JSON.stringify(user))
          }
        }
      } catch (error) {
      }
    },
    
    initUser() {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        this.isLoggedIn = user.isLoggedIn
        this.id = user.id
        this.email = user.email
        this.nickname = user.nickname
        this.avatar = user.avatar || ''
        this.token = user.token
        this.userId = user.userId
        this.isAdmin = user.is_admin || user.isAdmin || false
        
        this.refreshUserInfo()
      }
    }
  }
})