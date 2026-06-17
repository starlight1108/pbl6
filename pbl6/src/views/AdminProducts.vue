<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()

const products = ref([])
const isLoading = ref(true)
const currentPage = ref(1)
const totalPages = ref(1)
const searchKeyword = ref('')
const selectedStatus = ref('all')
const selectedCategory = ref('all')

const categories = ['书籍教材', '电子数码', '生活用品', '交通工具', '体育用品', '服饰鞋包', '美妆护肤', '其他']

const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '上架中' },
  { value: 'inactive', label: '已下架' },
  { value: 'sold', label: '已售出' }
]

const fetchProducts = async (page = 1) => {
  isLoading.value = true
  try {
    let url = `http://127.0.0.1:5000/api/admin/products?page=${page}&per_page=10`
    
    if (searchKeyword.value) {
      url += `&keyword=${encodeURIComponent(searchKeyword.value)}`
    }
    if (selectedStatus.value !== 'all') {
      url += `&status=${selectedStatus.value}`
    }
    if (selectedCategory.value !== 'all') {
      url += `&category=${encodeURIComponent(selectedCategory.value)}`
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })
    
    const data = await response.json()
    
    if (response.ok) {
      products.value = data.products || []
      totalPages.value = data.pages || 1
      currentPage.value = data.current_page || 1
    } else {
      console.error('获取商品失败:', data.error)
      alert(data.error || '获取商品失败')
    }
  } catch (error) {
    console.error('获取商品失败:', error)
    alert('获取商品失败')
  } finally {
    isLoading.value = false
  }
}

const handleSearch = () => {
  fetchProducts(1)
}

const handleStatusChange = () => {
  fetchProducts(1)
}

const handleCategoryChange = () => {
  fetchProducts(1)
}

const goToProductDetail = (productId) => {
  router.push(`/products/${productId}`)
}

const handleDelete = async (productId, productTitle) => {
  if (!confirm(`确定要删除商品「${productTitle}」吗？此操作不可恢复。`)) {
    return
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    })

    const data = await response.json()

    if (response.ok) {
      alert('商品删除成功')
      fetchProducts(currentPage.value)
    } else {
      alert(data.error || '删除失败')
    }
  } catch (error) {
    console.error('删除失败:', error)
    alert('删除失败')
  }
}

const handleStatusToggle = async (productId, currentStatus) => {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  const actionText = newStatus === 'inactive' ? '下架' : '上架'

  if (!confirm(`确定要${actionText}商品吗？`)) {
    return
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/admin/products/${productId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ status: newStatus })
    })

    const data = await response.json()

    if (response.ok) {
      const product = products.value.find(p => p.id === productId)
      if (product) {
        product.status = newStatus
      }
      alert(`${actionText}成功`)
    } else {
      alert(data.error || `${actionText}失败`)
    }
  } catch (error) {
    console.error('操作失败:', error)
    alert(`${actionText}失败`)
  }
}

const handleMarkSold = async (productId) => {
  if (!confirm('确定要标记此商品为已售出吗？')) {
    return
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/api/admin/products/${productId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify({ status: 'sold' })
    })

    const data = await response.json()

    if (response.ok) {
      const product = products.value.find(p => p.id === productId)
      if (product) {
        product.status = 'sold'
      }
      alert('标记已售出成功')
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('操作失败:', error)
    alert('操作失败')
  }
}

const handlePageChange = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    fetchProducts(page)
  }
}

const getStatusLabel = (status) => {
  const map = {
    'active': '上架中',
    'inactive': '已下架',
    'sold': '已售出'
  }
  return map[status] || status
}

const getStatusClass = (status) => {
  const map = {
    'active': 'bg-green-100 text-green-800',
    'inactive': 'bg-gray-100 text-gray-800',
    'sold': 'bg-blue-100 text-blue-800'
  }
  return map[status] || 'bg-gray-100 text-gray-800'
}

onMounted(() => {
  if (!userStore.isAdmin) {
    router.push('/')
    return
  }
  fetchProducts()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto px-4 py-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">管理员商品管理</h1>
        <button 
          @click="router.push('/')"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          返回首页
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-md p-6 mb-6">
        <div class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-[200px]">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索商品名称..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              @keyup.enter="handleSearch"
            />
          </div>
          <div class="min-w-[150px]">
            <select
              v-model="selectedStatus"
              @change="handleStatusChange"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
          <div class="min-w-[150px]">
            <select
              v-model="selectedCategory"
              @change="handleCategoryChange"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">全部分类</option>
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>
          <button
            @click="handleSearch"
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="text-center py-10">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <p class="mt-2 text-gray-600">加载中...</p>
      </div>

      <div v-else-if="products.length === 0" class="bg-white rounded-xl shadow-md p-12 text-center">
        <p class="text-gray-500">暂无商品</p>
      </div>

      <div v-else class="bg-white rounded-xl shadow-md overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">商品信息</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">卖家</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">价格</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">分类</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">状态</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                  <img 
                    :src="product.image" 
                    :alt="product.title"
                    class="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <h3 
                      class="font-medium text-gray-800 cursor-pointer hover:text-blue-600"
                      @click="goToProductDetail(product.id)"
                    >
                      {{ product.title }}
                    </h3>
                    <p class="text-sm text-gray-500">{{ product.created_at }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-gray-700">{{ product.seller?.nickname || '未知' }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="font-semibold text-red-600">¥{{ product.price }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="text-gray-700">{{ product.category }}</span>
              </td>
              <td class="px-6 py-4">
                <span :class="['px-3 py-1 rounded-full text-xs font-medium', getStatusClass(product.status)]">
                  {{ getStatusLabel(product.status) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex gap-2">
                  <button
                    v-if="product.status !== 'sold'"
                    @click="handleStatusToggle(product.id, product.status)"
                    class="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  >
                    {{ product.status === 'active' ? '下架' : '上架' }}
                  </button>
                  <button
                    v-if="product.status !== 'sold'"
                    @click="handleMarkSold(product.id)"
                    class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    标记售出
                  </button>
                  <button
                    @click="handleDelete(product.id, product.title)"
                    class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="totalPages > 1" class="px-6 py-4 border-t bg-gray-50">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-600">
              显示第 {{ (currentPage - 1) * 10 + 1 }} - {{ Math.min(currentPage * 10, products.length + (currentPage - 1) * 10) }} 条，共 {{ totalPages * 10 }} 条
            </p>
            <div class="flex gap-2">
              <button
                @click="handlePageChange(currentPage - 1)"
                :disabled="currentPage === 1"
                class="px-3 py-1 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span class="px-3 py-1 text-sm font-medium">{{ currentPage }} / {{ totalPages }}</span>
              <button
                @click="handlePageChange(currentPage + 1)"
                :disabled="currentPage === totalPages"
                class="px-3 py-1 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>