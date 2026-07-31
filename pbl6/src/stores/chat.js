import { defineStore } from 'pinia'
import { useUserStore } from './user.js'
import { io } from 'socket.io-client'
import request from '@/utils/request'

const WS_URL = 'http://127.0.0.1:5000'

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [],
    currentMessages: [],
    totalMessages: 0,
    currentPage: 1,
    totalPages: 1,
    onlineUsers: [],
    socket: null,
    isConnected: false,
    typingUsers: {},
    loading: false
  }),

  getters: {
    totalUnreadCount: (state) => {
      return state.conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
    }
  },

  actions: {
    connectWebSocket() {
      const userStore = useUserStore()
      if (!userStore.token || this.socket) return

      this.socket = io(`${WS_URL}/chat`, {
        transports: ['websocket', 'polling'],
        reconnection: false
      })

      this.socket.on('connect', () => {
        this.isConnected = true
        this.socket.emit('authenticate', { user_id: userStore.id, token: userStore.token })
      })

      this.socket.on('authenticated', (data) => {
        this.onlineUsers = data.online_users || []
      })

      this.socket.on('disconnect', () => {
        this.isConnected = false
      })

      this.socket.on('new_message', (message) => {
        if (this.currentMessages.some(m => m.id === message.id)) return
        if (this.currentMessages.length > 500) {
          this.currentMessages.shift()
        }
        this.currentMessages.push(message)
        this.loadConversations()
      })

      this.socket.on('unread_update', () => {
        this.loadConversations()
      })

      this.socket.on('user_status', (data) => {
        if (data.status === 'online') {
          if (!this.onlineUsers.includes(data.user_id)) {
            this.onlineUsers.push(data.user_id)
          }
        } else {
          this.onlineUsers = this.onlineUsers.filter(id => id !== data.user_id)
        }
      })

      this.socket.on('user_typing', (data) => {
        this.typingUsers = {
          ...this.typingUsers,
          [data.conversation_id]: data.is_typing ? data.user_id : null
        }
      })

      this.socket.on('error', (data) => {
        console.error('Socket error:', data.message)
      })

      this.socket.on('auth_error', (data) => {
        console.error('Socket auth error:', data.message)
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
      })
    },

    disconnectWebSocket() {
      if (this.socket) {
        this.socket.removeAllListeners()
        this.socket.close()
        this.socket = null
        this.isConnected = false
      }
    },

    async loadConversations() {
      try {
        const data = await request.get('/conversations')
        this.conversations = data.conversations
      } catch (error) {
        console.error('加载会话列表失败:', error)
      }
    },

    async createConversation(sellerId, productId) {
      const data = await request.post('/conversations', {
        seller_id: sellerId,
        product_id: productId
      })

      if (this.socket && this.isConnected) {
        this.socket.emit('join_room', { room: `conversation_${data.conversation.id}` })
      }

      return data.conversation
    },

    async loadMessages(conversationId, page = 1) {
      this.loading = true
      try {
        const data = await request.get(`/conversations/${conversationId}/messages`, {
          params: { page, per_page: 50 }
        })
        this.currentMessages = page === 1 ? data.messages : [...data.messages, ...this.currentMessages]
        this.totalMessages = data.total
        this.currentPage = data.current_page
        this.totalPages = data.pages
      } catch (error) {
        console.error('加载消息失败:', error)
      } finally {
        this.loading = false
      }
    },

    async sendMessage(conversationId, content) {
      try {
        await request.post(`/conversations/${conversationId}/messages`, { content })

        await this.loadConversations()
        return true
      } catch (error) {
        throw error
      }
    },

    sendMessageViaSocket(conversationId, content) {
      const userStore = useUserStore()
      if (this.socket && this.isConnected) {
        this.socket.emit('send_message', {
          token: userStore.token,
          conversation_id: conversationId,
          content
        })
      }
    },

    emitTyping(conversationId, isTyping) {
      const userStore = useUserStore()
      if (this.socket && this.isConnected) {
        this.socket.emit('typing', {
          conversation_id: conversationId,
          user_id: userStore.id,
          is_typing: isTyping
        })
      }
    },

    async markAsRead(conversationId) {
      try {
        await request.put(`/conversations/${conversationId}/read`)
        const conv = this.conversations.find(c => c.id === conversationId)
        if (conv) conv.unread_count = 0
      } catch (error) {
        console.error('标记已读失败:', error)
      }
    },

    isUserOnline(userId) {
      return this.onlineUsers.includes(userId)
    }
  }
})
