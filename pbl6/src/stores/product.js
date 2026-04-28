import { defineStore } from 'pinia'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: []
  }),
  
  actions: {
    async fetchProducts() {
      try {
        const response = await fetch(`${API_BASE_URL}/products`)
        const data = await response.json()
        if (data.products) {
          this.products = data.products
        }
        return true
      } catch (error) {
        console.error('获取商品列表失败:', error)
        return false
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
        console.log('token:', token ? '存在' : '不存在')
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
        const response = await fetch(`${API_BASE_URL}/products/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'inactive' })
        })
        
        if (response.ok) {
          const index = this.products.findIndex(p => p.id === id)
          if (index !== -1) {
            this.products[index].status = this.products[index].status === 'active' ? 'inactive' : 'active'
          }
          return true
        }
        return false
      } catch (error) {
        console.error('更新商品状态失败:', error)
        return false
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
    }
  }
})