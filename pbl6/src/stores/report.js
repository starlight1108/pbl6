import { defineStore } from 'pinia'
import request, { publicRequest } from '@/utils/request'

export const useReportStore = defineStore('report', {
  state: () => ({
    reports: [],
    total: 0,
    pages: 0,
    currentPage: 1,
    reasons: []
  }),
  
  actions: {
    
    async fetchReasons() {
      try {
        const data = await publicRequest.get('/reports/reasons')
        this.reasons = data.reasons
        return data.reasons
      } catch (error) {
        throw error
      }
    },
    
    async createReport(productId, reason, description = '') {
      try {
        const data = await request.post('/reports', {
          product_id: productId,
          reason: reason,
          description: description
        })
        
        return data
      } catch (error) {
        throw error
      }
    },
    
    async fetchReports(page = 1, perPage = 20, status = null) {
      try {
        const params = { page, per_page: perPage }
        if (status) params.status = status
        
        const data = await request.get('/reports', { params })
        
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
        const data = await request.get(`/reports/${reportId}`)
        
        return data.report
      } catch (error) {
        throw error
      }
    }
  }
})