import { defineStore } from 'pinia'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: JSON.parse(localStorage.getItem('products')) || []
  }),
  
  actions: {
    addProduct(product, username) {
      // 生成唯一ID
      const id = Date.now().toString()
      const newProduct = {
        id,
        ...product,
        createdAt: new Date().toISOString(),
        publisher: username,
        isActive: true
      }
      
      this.products.push(newProduct)
      this.saveToLocalStorage()
      return newProduct
    },
    
    updateProduct(id, updatedProduct) {
      const index = this.products.findIndex(product => product.id === id)
      if (index !== -1) {
        this.products[index] = {
          ...this.products[index],
          ...updatedProduct,
          updatedAt: new Date().toISOString()
        }
        this.saveToLocalStorage()
        return true
      }
      return false
    },
    
    toggleProductStatus(id) {
      const index = this.products.findIndex(product => product.id === id)
      if (index !== -1) {
        this.products[index].isActive = !this.products[index].isActive
        this.products[index].updatedAt = new Date().toISOString()
        this.saveToLocalStorage()
        return true
      }
      return false
    },
    
    getProductById(id) {
      return this.products.find(product => product.id === id)
    },
    
    deleteProduct(id) {
      const index = this.products.findIndex(product => product.id === id)
      if (index !== -1) {
        this.products.splice(index, 1)
        this.saveToLocalStorage()
        return true
      }
      return false
    },
    
    saveToLocalStorage() {
      localStorage.setItem('products', JSON.stringify(this.products))
    }
  }
})