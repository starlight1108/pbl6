<script setup>
import { onMounted, watch, nextTick } from 'vue'
import { useUserStore } from './stores/user.js'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

onMounted(async () => {
  userStore.initUser()
  
  await nextTick()
  
  const path = router.currentRoute.value.path
  if (!userStore.isLoggedIn && path !== '/login' && !path.startsWith('/register')) {
    router.push('/login')
  }
})

watch(() => userStore.isLoggedIn, (loggedIn) => {
  const path = router.currentRoute.value.path
  if (!loggedIn && path !== '/login' && !path.startsWith('/register')) {
    router.push('/login')
  }
})
</script>

<template>
  <router-view />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
}
</style>
