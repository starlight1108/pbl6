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
      path: '/publish',
      name: 'publish',
      component: () => import('../views/Product发布.vue')
    },
    {
      path: '/product/:id',
      name: 'product-detail',
      component: () => import('../views/ProductDetail.vue')
    }
  ],
})

export default router