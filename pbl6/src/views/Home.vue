<script setup>
import { useUserStore } from '../stores/user.js'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1>二手校园交易平台</h1>
      <div class="user-info">
        <span>欢迎，{{ userStore.username }}</span>
        <button @click="handleLogout" class="logout-button">退出登录</button>
      </div>
    </div>
    
    <div class="content">
      <h2>首页</h2>
      <p>这里是二手校园交易平台的首页，您可以在这里浏览和发布二手商品。</p>
    </div>
  </div>
</template>

<style scoped>
.home-container {
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
  color: #4CAF50;
  margin: 0;
  font-size: 24px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-info span {
  color: #333;
  font-size: 16px;
}

.logout-button {
  padding: 8px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.logout-button:hover {
  background-color: #d32f2f;
}

.content {
  max-width: 1200px;
  margin: 40px auto;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.content h2 {
  color: #333;
  margin-bottom: 20px;
}

.content p {
  color: #666;
  font-size: 16px;
  line-height: 1.5;
}
</style>