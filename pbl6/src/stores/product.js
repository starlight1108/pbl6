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
    
    async fetchProducts(page = 1, perPage = 20, category = null, keyword = null, sortBy = 'created_at', sortOrder = 'desc') {
      try {
        let url = `${API_BASE_URL}/products?page=${page}&per_page=${perPage}`
        if (category) url += `&category=${encodeURIComponent(category)}`
        if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`
        if (sortBy) url += `&sort_by=${encodeURIComponent(sortBy)}`
        if (sortOrder) url += `&sort_order=${encodeURIComponent(sortOrder)}`
        
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
    
    async addProduct(product, token) {
      try {
        const formData = new FormData()
        formData.append('title', product.name)
        formData.append('price', product.price)
        formData.append('description', product.description)
        formData.append('category', product.category || '其他')
        
        if (product.image) {
          formData.append('image', product.image)
        }
        
        console.log('发送请求到:', `${API_BASE_URL}/products`)
        console.log('token长度:', token ? token.length : 0)
        console.log('token前20字符:', token ? token.substring(0, 20) + '...' : '空')
        console.log('formData内容:', {
          title: product.name,
          price: product.price,
          description: product.description,
          category: product.category,
          hasImage: !!product.image
        })
        
        const response = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        
        console.log('响应状态:', response.status)
        
        if (response.status === 401) {
          console.error('401未授权 - token可能过期或无效')
          const userStore = useUserStore()
          userStore.logout()
          throw new Error('登录状态已过期，请重新登录')
        }
        
        const data = await response.json()
        console.log('响应数据:', data)
        
        if (response.ok) {
          this.products.unshift(data.product)
          return data.product
        } else {
          throw new Error(data.error || '发布商品失败，状态码: ' + response.status)
        }
      } catch (error) {
        console.error('发布商品失败:', error)
        throw error
      }
    },
    
    async toggleProductStatus(id, token) {
      try {
        const product = this.products.find(p => p.id === id)
        const newStatus = product?.status === 'active' ? 'inactive' : 'active'
        
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        })
        
        if (response.ok) {
          const index = this.products.findIndex(p => p.id === id)
          if (index !== -1) {
            this.products[index].status = newStatus
          }
          return true
        }
        return false
      } catch (error) {
        console.error('更新商品状态失败:', error)
        return false
      }
    },
    
    async updateProduct(id, productData, token) {
      try {
        const formData = new FormData()
        
        if (productData.title) formData.append('title', productData.title)
        if (productData.description) formData.append('description', productData.description)
        if (productData.price) formData.append('price', productData.price)
        if (productData.category) formData.append('category', productData.category)
        if (productData.status) formData.append('status', productData.status)
        if (productData.image) formData.append('image', productData.image)
        
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '更新商品失败')
        }
        
        const index = this.products.findIndex(p => p.id === id)
        if (index !== -1) {
          this.products[index] = data.product
        }
        
        return data.product
      } catch (error) {
        throw error
      }
    },
    
    async deleteProduct(id, token) {
      try {
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          this.products = this.products.filter(p => p.id !== id)
          return true
        }
        return false
      } catch (error) {
        console.error('删除商品失败:', error)
        return false
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
    },
    
    async addFavorite(productId, token) {
      try {
        const response = await fetch(`${API_BASE_URL}/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ product_id: productId })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '添加收藏失败')
        }
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async removeFavorite(productId, token) {
      try {
        const response = await fetch(`${API_BASE_URL}/favorites/${productId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '取消收藏失败')
        }
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async checkFavorite(productId, token) {
      try {
        const response = await fetch(`${API_BASE_URL}/favorites/check/${productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '检查收藏状态失败')
        }
        
        return data.is_favorite
      } catch (error) {
        return false
      }
    },
    
    async getFavorites(token) {
      try {
        const response = await fetch(`${API_BASE_URL}/favorites`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const data = await response.json()
        console.log('Favorites API response:', data)
        
        if (!response.ok) {
          const errorMsg = data.error || data.msg || '获取收藏列表失败'
          if (errorMsg.includes('expired') || errorMsg.includes('过期')) {
            throw new Error('token_expired')
          }
          throw new Error(errorMsg)
        }
        
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
        const response = await fetch(`${API_BASE_URL}/categories`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '获取分类失败')
        }
        
        return data.categories
      } catch (error) {
        throw error
      }
    }
  }
})