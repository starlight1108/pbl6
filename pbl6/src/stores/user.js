import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: false,
    username: '',
    token: '',
    isAdmin: false
  }),
  
  actions: {
    async login(username, password) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (username && password) {
            this.isLoggedIn = true
            this.username = username
            this.token = 'mock-token-' + Date.now()
            // 简单判断：用户名为 'admin' 时设置为管理员
            this.isAdmin = username === 'admin'
            localStorage.setItem('user', JSON.stringify({
              isLoggedIn: true,
              username,
              token: this.token,
              isAdmin: this.isAdmin
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
          // 注册用户默认不是管理员
          this.isAdmin = false
          localStorage.setItem('user', JSON.stringify({
            isLoggedIn: true,
            username,
            token: this.token,
            isAdmin: this.isAdmin
          }))
          
          resolve()
        }, 1000)
      })
    },
    
    logout() {
      this.isLoggedIn = false
      this.username = ''
      this.token = ''
      this.isAdmin = false
      localStorage.removeItem('user')
    },
    
    initUser() {
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        this.isLoggedIn = user.isLoggedIn
        this.username = user.username
        this.token = user.token
        this.isAdmin = user.isAdmin || false
      }
    }
  }
})