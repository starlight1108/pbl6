<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductStore } from '../stores/product.js'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()

onMounted(async () => {
  const productId = route.params.id
  await productStore.fetchProductDetail(productId)
})

const goBack = () => {
  router.push('/products')
}
</script>

<template>
  <div class="detail-container">
    <div class="header">
      <h1>商品详情</h1>
      <button @click="goBack" class="back-button">返回列表</button>
    </div>
    
    <div v-if="productStore.currentProduct" class="content">
      <div class="product-detail">
        <div class="product-image">
          <span class="category-tag">{{ productStore.currentProduct.category }}</span>
        </div>
        
        <div class="product-info">
          <h2 class="product-title">{{ productStore.currentProduct.title }}</h2>
          <p class="product-price">¥{{ productStore.currentProduct.price }}</p>
          
          <div class="info-item">
            <span class="label">卖家：</span>
            <span class="value">{{ productStore.currentProduct.seller?.nickname || '匿名' }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">分类：</span>
            <span class="value">{{ productStore.currentProduct.category }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">状态：</span>
            <span class="value">{{ productStore.currentProduct.status === 'active' ? '在售' : '已售' }}</span>
          </div>
          
          <div class="info-item">
            <span class="label">发布时间：</span>
            <span class="value">{{ new Date(productStore.currentProduct.created_at).toLocaleString() }}</span>
          </div>
          
          <div class="description">
            <h3>商品描述</h3>
            <p>{{ productStore.currentProduct.description || '暂无描述' }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="loading">
      加载中...
    </div>
  </div>
</template>

<style scoped>
.detail-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background-color: white;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h1 {
  color: #333;
  margin: 0;
  font-size: 24px;
}

.back-button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.back-button:hover {
  background-color: #45a049;
}

.content {
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
}

.product-detail {
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.product-image {
  height: 300px;
  background-color: #e0e0e0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 15px;
}

.category-tag {
  background-color: #4CAF50;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.product-info {
  padding: 30px;
}

.product-title {
  font-size: 28px;
  color: #333;
  margin: 0 0 20px 0;
}

.product-price {
  font-size: 32px;
  color: #f44336;
  font-weight: bold;
  margin: 0 0 30px 0;
}

.info-item {
  display: flex;
  margin-bottom: 15px;
}

.info-item .label {
  color: #999;
  width: 80px;
  flex-shrink: 0;
}

.info-item .value {
  color: #333;
}

.description {
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.description h3 {
  color: #333;
  margin: 0 0 15px 0;
  font-size: 18px;
}

.description p {
  color: #666;
  line-height: 1.8;
  margin: 0;
}

.loading {
  text-align: center;
  padding: 50px;
  color: #999;
  font-size: 18px;
}
</style>