import { defineStore } from 'pinia'
import { useUserStore } from './user.js'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    currentProduct: null,
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
    
    async fetchProducts(page = 1, perPage = 20, category = null, keyword = null) {
      try {
        let url = `${API_BASE_URL}/products?page=${page}&per_page=${perPage}`
        if (category) url += `&category=${encodeURIComponent(category)}`
        if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`
        
        const response = await fetch(url)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '获取商品列表失败')
        }
        
        this.products = data.products
        this.total = data.total
        this.pages = data.pages
        this.currentPage = data.current_page
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async fetchProductDetail(productId) {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '获取商品详情失败')
        }
        
        this.currentProduct = data.product
        return data.product
      } catch (error) {
        throw error
      }
    },
    
    async createProduct(productData) {
      try {
        const response = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(productData)
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '发布商品失败')
        }
        
        return data
      } catch (error) {
        throw error
      }
    }
  }
})