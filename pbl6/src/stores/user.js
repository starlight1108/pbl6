import { defineStore } from 'pinia'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: false,
    email: '',
    nickname: '',
    token: ''
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
        this.email = data.user.email
        this.nickname = data.user.nickname
        this.token = data.access_token
        
        localStorage.setItem('user', JSON.stringify({
          isLoggedIn: true,
          email: data.user.email,
          nickname: data.user.nickname,
          token: data.access_token
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
      this.email = ''
      this.nickname = ''
      this.token = ''
      localStorage.removeItem('user')
    },
    
    initUser() {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        this.isLoggedIn = user.isLoggedIn
        this.email = user.email
        this.nickname = user.nickname
        this.token = user.token
      }
    }
  }
})