import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/Home.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue')
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/Register.vue')
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/Products.vue')
    },
    {
      path: '/products/publish',
      name: 'publish',
      component: () => import('../views/PublishProduct.vue')
    },
    {
      path: '/products/:id/edit',
      name: 'product-edit',
      component: () => import('../views/EditProduct.vue')
    },
    {
      path: '/products/:id',
      name: 'product-detail',
      component: () => import('../views/ProductDetail.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue')
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('../views/Notifications.vue')
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('../views/ChatConversations.vue')
    },
    {
      path: '/chat/:id',
      name: 'chat-room',
      component: () => import('../views/ChatRoom.vue')
    }
  ],
})

export default router
