import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: false,
    username: '',
    token: ''
  }),
  
  actions: {
    async login(username, password) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (username && password) {
            this.isLoggedIn = true
            this.username = username
            this.token = 'mock-token-' + Date.now()
            localStorage.setItem('user', JSON.stringify({
              isLoggedIn: true,
              username,
              token: this.token
            }))
            resolve()
          } else {
            reject(new Error('用户名或密码不能为空'))
          }
        }, 1000)
      })
    },
    
    async register(username, password) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const users = JSON.parse(localStorage.getItem('users') || '[]')
          const existingUser = users.find(u => u.username === username)
          
          if (existingUser) {
            reject(new Error('用户名已存在'))
            return
          }
          
          users.push({ username, password })
          localStorage.setItem('users', JSON.stringify(users))
          
          this.isLoggedIn = true
          this.username = username
          this.token = 'mock-token-' + Date.now()
          localStorage.setItem('user', JSON.stringify({
            isLoggedIn: true,
            username,
            token: this.token
          }))
          
          resolve()
        }, 1000)
      })
    },
    
    logout() {
      this.isLoggedIn = false
      this.username = ''
      this.token = ''
      localStorage.removeItem('user')
    },
    
    initUser() {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        this.isLoggedIn = user.isLoggedIn
        this.username = user.username
        this.token = user.token
      }
    }
  }
})