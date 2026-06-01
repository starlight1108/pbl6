import { defineStore } from 'pinia'
import { useUserStore } from './user.js'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    currentOrder: null,
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

    async fetchOrders(role = 'buy', page = 1) {
      try {
        const response = await fetch(`${API_BASE_URL}/orders?role=${role}&page=${page}&per_page=20`, {
          headers: this.getAuthHeaders()
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '获取订单列表失败')
        }

        this.orders = data.orders
        this.total = data.total
        this.pages = data.pages
        this.currentPage = data.current_page

        return data
      } catch (error) {
        throw error
      }
    },

    async fetchOrderDetail(orderId) {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
          headers: this.getAuthHeaders()
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '获取订单详情失败')
        }

        this.currentOrder = data.order
        return data.order
      } catch (error) {
        throw error
      }
    },

    async createOrder(productId, finalPrice) {
      try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            product_id: productId,
            final_price: finalPrice
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '创建订单失败')
        }

        return data.order
      } catch (error) {
        throw error
      }
    },

    async completeOrder(orderId) {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/complete`, {
          method: 'PUT',
          headers: this.getAuthHeaders()
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '确认完成失败')
        }

        this.currentOrder = data.order
        return data.order
      } catch (error) {
        throw error
      }
    },

    async cancelOrder(orderId) {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
          method: 'PUT',
          headers: this.getAuthHeaders()
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || '取消订单失败')
        }

        this.currentOrder = data.order
        return data.order
      } catch (error) {
        throw error
      }
    }
  }
})
