import { defineStore } from 'pinia'
import request from '@/utils/request'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    currentOrder: null,
    total: 0,
    pages: 0,
    currentPage: 1
  }),

  actions: {

    async fetchOrders(role = 'buy', page = 1) {
      try {
        const data = await request.get('/orders', { params: { role, page, per_page: 20 } })

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
        const data = await request.get(`/orders/${orderId}`)

        this.currentOrder = data.order
        return data.order
      } catch (error) {
        throw error
      }
    },

    async createOrder(productId, finalPrice, transactionType = 'offline') {
      try {
        const data = await request.post('/orders', {
          product_id: productId,
          final_price: finalPrice,
          transaction_type: transactionType
        })

        return data.order
      } catch (error) {
        throw error
      }
    },

    async confirmOrder(orderId) {
      const data = await request.put(`/orders/${orderId}/confirm`)
      return data.order
    },

    async closeOrder(orderId) {
      const data = await request.put(`/orders/${orderId}/close`)
      return data.order
    },

    async payOrder(orderId) {
      const data = await request.post(`/orders/${orderId}/pay`)
      return data.order
    },

    async deliverOrder(orderId, trackingNumber = '') {
      const data = await request.put(`/orders/${orderId}/deliver`, { tracking_number: trackingNumber })
      return data.order
    },

    async receiveOrder(orderId) {
      const data = await request.put(`/orders/${orderId}/receive`)
      return data.order
    },

    async refundRequest(orderId, reason = '') {
      const data = await request.post(`/orders/${orderId}/refund-request`, { reason })
      return data.order
    },

    async refundAgree(orderId) {
      const data = await request.put(`/orders/${orderId}/refund-agree`)
      return data.order
    },

    async refundReject(orderId) {
      const data = await request.put(`/orders/${orderId}/refund-reject`)
      return data.order
    },

    async getTransactions(orderId) {
      const data = await request.get(`/orders/${orderId}/transactions`)
      return data.transactions
    },

    async completeOrder(orderId) {
      try {
        const data = await request.put(`/orders/${orderId}/complete`)

        this.currentOrder = data.order
        return data.order
      } catch (error) {
        throw error
      }
    },

    async cancelOrder(orderId) {
      try {
        const data = await request.put(`/orders/${orderId}/cancel`)

        this.currentOrder = data.order
        return data.order
      } catch (error) {
        throw error
      }
    }
  }
})
