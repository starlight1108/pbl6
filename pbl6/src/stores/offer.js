import { defineStore } from 'pinia'
import { useUserStore } from './user.js'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

export const useOfferStore = defineStore('offer', {
  state: () => ({
    sellerOffers: [],
    myOffers: [],
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
    
    async createOffer(productId, offeredPrice, message = '') {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/offers`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            offered_price: offeredPrice,
            message: message
          })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '报价失败')
        }
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async fetchSellerOffers(productId) {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/offers`, {
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '获取报价失败')
        }
        
        this.sellerOffers = data.offers
        return data.offers
      } catch (error) {
        throw error
      }
    },
    
    async acceptOffer(offerId) {
      try {
        const response = await fetch(`${API_BASE_URL}/offers/${offerId}/accept`, {
          method: 'PUT',
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '接受报价失败')
        }
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async rejectOffer(offerId) {
      try {
        const response = await fetch(`${API_BASE_URL}/offers/${offerId}/reject`, {
          method: 'PUT',
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '拒绝报价失败')
        }
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async fetchMyOffers(page = 1, perPage = 20, status = null) {
      try {
        let url = `${API_BASE_URL}/my-offers?page=${page}&per_page=${perPage}`
        if (status) url += `&status=${status}`
        
        const response = await fetch(url, {
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '获取报价列表失败')
        }
        
        this.myOffers = data.offers
        this.total = data.total
        this.pages = data.pages
        this.currentPage = data.current_page
        
        return data
      } catch (error) {
        throw error
      }
    }
  }
})