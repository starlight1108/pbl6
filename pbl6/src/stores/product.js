import { defineStore } from 'pinia'
import request, { publicRequest } from '@/utils/request'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    currentProduct: null,
    total: 0,
    pages: 0,
    currentPage: 1
  }),
  
  actions: {
    
    async fetchProducts(page = 1, perPage = 20, category = null, keyword = null, sortBy = 'created_at', sortOrder = 'desc') {
      try {
        const params = { page, per_page: perPage }
        if (category) params.category = category
        if (keyword) params.keyword = keyword
        if (sortBy) params.sort_by = sortBy
        if (sortOrder) params.sort_order = sortOrder
        
        const data = await publicRequest.get('/products', { params })
        
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
        const data = await publicRequest.get(`/products/${productId}`)
        
        this.currentProduct = data.product
        return data.product
      } catch (error) {
        throw error
      }
    },
    
    async addProduct(product) {
      try {
        const formData = new FormData()
        formData.append('title', product.name)
        formData.append('price', product.price)
        formData.append('description', product.description)
        formData.append('category', product.category || '其他')
        
        if (product.image) {
          formData.append('image', product.image)
        }
        
        const data = await request.post('/products', formData)
        
        this.products.unshift(data.product)
        return data.product
      } catch (error) {
        console.error('发布商品失败:', error)
        throw error
      }
    },
    
    async toggleProductStatus(id) {
      try {
        const product = this.products.find(p => p.id === id)
        const newStatus = product?.status === 'active' ? 'inactive' : 'active'
        
        await request.put(`/products/${id}`, { status: newStatus })
        
        const index = this.products.findIndex(p => p.id === id)
        if (index !== -1) {
          this.products[index].status = newStatus
        }
        return true
      } catch (error) {
        console.error('更新商品状态失败:', error)
        return false
      }
    },
    
    async updateProduct(id, productData) {
      try {
        const formData = new FormData()
        
        if (productData.title) formData.append('title', productData.title)
        if (productData.description) formData.append('description', productData.description)
        if (productData.price) formData.append('price', productData.price)
        if (productData.category) formData.append('category', productData.category)
        if (productData.status) formData.append('status', productData.status)
        if (productData.image) formData.append('image', productData.image)
        
        const data = await request.put(`/products/${id}`, formData)
        
        const index = this.products.findIndex(p => p.id === id)
        if (index !== -1) {
          this.products[index] = data.product
        }
        
        return data.product
      } catch (error) {
        throw error
      }
    },
    
    async deleteProduct(id) {
      try {
        await request.delete(`/products/${id}`)
        
        this.products = this.products.filter(p => p.id !== id)
        return true
      } catch (error) {
        console.error('删除商品失败:', error)
        return false
      }
    },
    
    async createProduct(productData) {
      try {
        const data = await request.post('/products', productData)
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async addFavorite(productId) {
      try {
        const data = await request.post('/favorites', { product_id: productId })
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async removeFavorite(productId) {
      try {
        const data = await request.delete(`/favorites/${productId}`)
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async checkFavorite(productId) {
      try {
        const data = await request.get(`/favorites/check/${productId}`)
        
        return data.is_favorite
      } catch (error) {
        return false
      }
    },
    
    async getFavorites() {
      try {
        const data = await request.get('/favorites')
        
        if (!data.favorites || !Array.isArray(data.favorites)) {
          return []
        }
        
        return data.favorites.map(f => f.product).filter(p => p !== null)
      } catch (error) {
        console.error('Get favorites error:', error)
        throw error
      }
    },
    
    async getCategories() {
      try {
        const data = await publicRequest.get('/categories')
        
        return data.categories
      } catch (error) {
        throw error
      }
    }
  }
})