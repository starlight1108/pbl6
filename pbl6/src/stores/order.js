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

    async createOrder(productId, finalPrice, transactionType = 'offline') {
      try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            product_id: productId,
            final_price: finalPrice,
            transaction_type: transactionType
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

    async confirmOrder(orderId) {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/confirm`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '确认失败')
      return data.order
    },

    async closeOrder(orderId) {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/close`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '关闭失败')
      return data.order
    },

    async payOrder(orderId) {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/pay`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '支付失败')
      return data.order
    },

    async deliverOrder(orderId, trackingNumber = '') {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/deliver`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ tracking_number: trackingNumber })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '交付确认失败')
      return data.order
    },

    async receiveOrder(orderId) {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/receive`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '确认收货失败')
      return data.order
    },

    async refundRequest(orderId, reason = '') {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/refund-request`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ reason })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '退款申请失败')
      return data.order
    },

    async refundAgree(orderId) {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/refund-agree`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '退款处理失败')
      return data.order
    },

    async refundReject(orderId) {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/refund-reject`, {
        method: 'PUT',
        headers: this.getAuthHeaders()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '退款拒绝失败')
      return data.order
    },

    async getTransactions(orderId) {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/transactions`, {
        headers: this.getAuthHeaders()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '查询交易流水失败')
      return data.transactions
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
