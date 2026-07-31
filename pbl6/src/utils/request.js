import axios from 'axios'

/**
 * 集中式 HTTP 请求模块
 * - 自动附加 Authorization header（从 localStorage 读取 token）
 * - 自动解析 JSON 响应体（返回 response.data）
 * - 统一错误处理（401 自动登出、网络异常提示）
 * - 15 秒超时
 *
 * 用法：
 *   import request from '@/utils/request'
 *   const data = await request.get('/products', { params: { page: 1 } })
 *   const data = await request.post('/products', { title: '...' })
 *   const data = await request.put('/products/1', { status: 'active' })
 *   const data = await request.delete('/products/1')
 *   // FormData 上传（不要手动设置 Content-Type，axios 会自动处理）
 *   const data = await request.post('/products', formData)
 *
 * 公开接口（跳过认证）：
 *   import { publicRequest } from '@/utils/request'
 *   const data = await publicRequest.get('/products')
 */

// ---- 内部工具函数 ----

/** 从 localStorage 获取当前 token */
function getToken() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return ''
    const user = JSON.parse(raw)
    return user?.token || ''
  } catch {
    return ''
  }
}

/** 清除登录状态 */
function handleUnauthorized() {
  localStorage.removeItem('user')
  // 避免重复跳转
  if (window.location.hash !== '#/login') {
    window.location.hash = '#/login'
  }
}

// ---- 响应拦截器（共享） ----

function responseSuccess(response) {
  // 直接返回 data，省去每次 .json() / .data
  return response.data
}

function responseError(error) {
  if (error.response) {
    const { status, data } = error.response
    if (status === 401) {
      handleUnauthorized()
    }
    // 提取后端返回的错误信息
    const message = data?.error || data?.msg || `请求失败 (${status})`
    return Promise.reject(new Error(message))
  }
  // 网络异常或超时
  if (error.code === 'ECONNABORTED') {
    return Promise.reject(new Error('请求超时，请检查网络'))
  }
  return Promise.reject(new Error('网络异常，请检查连接'))
}

// ---- 基础配置 ----

const baseConfig = {
  baseURL: 'http://127.0.0.1:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
}

// ---- 公开请求实例（不附加 Authorization） ----

export const publicRequest = axios.create(baseConfig)
publicRequest.interceptors.response.use(responseSuccess, responseError)

// ---- 认证请求实例 ----

const request = axios.create(baseConfig)

request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // FormData 上传时移除 Content-Type，让 axios 自动设置 multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(responseSuccess, responseError)

export default request
