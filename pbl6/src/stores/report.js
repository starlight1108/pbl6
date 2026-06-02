import { defineStore } from 'pinia'
import { useUserStore } from './user.js'

const API_BASE_URL = 'http://127.0.0.1:5000/api'

export const useReportStore = defineStore('report', {
  state: () => ({
    reports: [],
    total: 0,
    pages: 0,
    currentPage: 1,
    reasons: []
  }),
  
  actions: {
    getAuthHeaders() {
      const userStore = useUserStore()
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      }
    },
    
    async fetchReasons() {
      try {
        const response = await fetch(`${API_BASE_URL}/reports/reasons`)
        const data = await response.json()
        this.reasons = data.reasons
        return data.reasons
      } catch (error) {
        throw error
      }
    },
    
    async createReport(productId, reason, description = '') {
      try {
        const response = await fetch(`${API_BASE_URL}/reports`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            product_id: productId,
            reason: reason,
            description: description
          })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '举报失败')
        }
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async fetchReports(page = 1, perPage = 20, status = null) {
      try {
        let url = `${API_BASE_URL}/reports?page=${page}&per_page=${perPage}`
        if (status) url += `&status=${status}`
        
        const response = await fetch(url, {
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '获取举报列表失败')
        }
        
        this.reports = data.reports
        this.total = data.total
        this.pages = data.pages
        this.currentPage = data.current_page
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async fetchReport(reportId) {
      try {
        const response = await fetch(`${API_BASE_URL}/reports/${reportId}`, {
          headers: this.getAuthHeaders()
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '获取举报详情失败')
        }
        
        return data.report
      } catch (error) {
        throw error
      }
    }
  }
})