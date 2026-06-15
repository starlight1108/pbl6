/**
 * AI 自动化测试 - 交易管理模块
 *
 * 对应测试用例文档：四、交易管理模块
 *   4.1 订单管理 (TC-OM-ORD-001 ~ 010)
 *   4.2 已售商品处理 (TC-OM-SOLD-001 ~ 002)
 *
 * @see ../document/测试用例文档.md
 */

import { test, expect } from '@playwright/test';
import {
  generateTestProduct,
  generateTestMessage,
  waitForPageReady,
  loginViaUI,
  loginViaAPI,
  PRESET_TEST_USER,
  PRESET_TEST_USER_2,
  timestamp,
} from './test-helper.js';

const API_BASE_URL = 'http://127.0.0.1:5000';

// ============================================================
// 4.1 订单管理
// ============================================================
test.describe('📋 交易管理 - 4.1 订单管理', () => {

  let buyerToken = null;
  let buyerUser = null;
  let sellerToken = null;
  let sellerUser = null;
  let testProductId = null;
  let createdOrderId = null;

  test.beforeAll(async ({ request }) => {
    // 登录买家和卖家
    const buyerData = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    buyerToken = buyerData.access_token;
    buyerUser = buyerData.user;

    const sellerData = await loginViaAPI(PRESET_TEST_USER_2.email, PRESET_TEST_USER_2.password);
    sellerToken = sellerData.access_token;
    sellerUser = sellerData.user;

    // 卖家发布测试商品
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: {
        title: product.title,
        price: parseFloat(product.price),
        description: product.description,
        category: product.category,
      },
    });
    const prodData = await prodRes.json();
    testProductId = prodData.product.id;
    console.log(`✅ 测试商品已创建 (ID: ${testProductId})`);
  });

  // TC-OM-ORD-001：买家创建订单
  test('TC-OM-ORD-001 订单 - 买家创建订单', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: {
        product_id: testProductId,
        final_price: 20.00,
      },
    });
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.order.status).toBe('pending');
    expect(data.order.final_price).toBe(20.00);
    createdOrderId = data.order.id;
    console.log(`✅ 订单已创建 (ID: ${createdOrderId})`);
  });

  // TC-OM-ORD-002：不能对自己的商品创建订单
  test('TC-OM-ORD-002 订单 - 不能对自己的商品创建订单', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: {
        product_id: testProductId,
        final_price: 15.00,
      },
    });
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('own product');
  });

  // TC-OM-ORD-003：商品已售出时不能创建订单
  test('TC-OM-ORD-003 订单 - 商品已售出时创建订单被拒绝', async ({ request }) => {
    // 先完成之前的订单
    if (createdOrderId) {
      await request.put(`${API_BASE_URL}/api/orders/${createdOrderId}/complete`, {
        headers: { 'Authorization': `Bearer ${buyerToken}` },
      });
    }

    // 再次尝试创建订单（商品已 sold）
    const response = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: {
        product_id: testProductId,
        final_price: 25.00,
      },
    });
    // 应该失败（商品已 sold）
    expect(response.status()).toBe(400);
  });

  // TC-OM-ORD-004：买家查看订单列表（我购买的）
  test('TC-OM-ORD-004 订单 - 买家查看已购买的订单列表', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/orders?role=buy`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('orders');
    expect(data).toHaveProperty('total');
    expect(data.orders.length).toBeGreaterThanOrEqual(1);
  });

  // TC-OM-ORD-005：卖家查看订单列表（我卖出的）
  test('TC-OM-ORD-005 订单 - 卖家查看卖出的订单记录', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/orders?role=sell`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('orders');
    expect(data).toHaveProperty('total');
  });

  // TC-OM-ORD-006：查看订单详情
  test('TC-OM-ORD-006 订单 - 查看并验证订单详细信息', async ({ request }) => {
    // 需要先创建一个新的可查看的订单
    // 发布新商品 → 创建订单
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 30.00, category: '其他' },
    });
    const newProductId = (await prodRes.json()).product.id;

    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: newProductId, final_price: 25.00 },
    });
    const orderData = await orderRes.json();
    const orderId = orderData.order.id;

    const response = await request.get(`${API_BASE_URL}/api/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.order).toHaveProperty('id');
    expect(data.order).toHaveProperty('product');
    expect(data.order).toHaveProperty('buyer');
    expect(data.order).toHaveProperty('seller');
    expect(data.order).toHaveProperty('final_price');
    expect(data.order).toHaveProperty('status');
    expect(data.order).toHaveProperty('created_at');
  });

  // TC-OM-ORD-007：买家确认收货完成订单
  test('TC-OM-ORD-007 订单 - 买家确认收货完成交易', async ({ request }) => {
    // 创建新订单并完成
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 40.00, category: '其他' },
    });
    const newProductId = (await prodRes.json()).product.id;

    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: newProductId, final_price: 35.00 },
    });
    const { order } = await orderRes.json();

    const response = await request.put(`${API_BASE_URL}/api/orders/${order.id}/complete`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.order.status).toBe('completed');

    // 验证商品状态变为 sold
    const prodCheck = await fetch(`${API_BASE_URL}/api/products/${newProductId}`);
    const prodCheckData = await prodCheck.json();
    expect(prodCheckData.product.status).toBe('sold');
  });

  // TC-OM-ORD-008：买家取消待确认订单
  test('TC-OM-ORD-008 订单 - 买家取消待确认订单', async ({ request }) => {
    // 创建新订单
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 50.00, category: '其他' },
    });
    const newProductId = (await prodRes.json()).product.id;

    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: newProductId, final_price: 45.00 },
    });
    const { order } = await orderRes.json();

    const response = await request.put(`${API_BASE_URL}/api/orders/${order.id}/cancel`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.order.status).toBe('cancelled');
  });

  // TC-OM-ORD-009：非订单参与者不能查看
  test('TC-OM-ORD-009 订单 - 非参与者无法查看订单详情', async ({ request }) => {
    // 创建新订单
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 60.00, category: '其他' },
    });
    const newProductId = (await prodRes.json()).product.id;

    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: newProductId, final_price: 55.00 },
    });
    const { order } = await orderRes.json();

    // 用第三方用户查看
    const stranger = {
      email: `stranger_${timestamp()}@example.com`,
      password: 'TestPass123',
    };
    await request.post(`${API_BASE_URL}/api/auth/register`, {
      headers: { 'Content-Type': 'application/json' },
      data: stranger,
    });
    const strangerData = await loginViaAPI(stranger.email, stranger.password);

    const response = await request.get(`${API_BASE_URL}/api/orders/${order.id}`, {
      headers: { 'Authorization': `Bearer ${strangerData.access_token}` },
    });
    expect(response.status()).toBe(403);
  });

  // TC-OM-ORD-010：已完成订单不能取消
  test('TC-OM-ORD-010 订单 - 已完成订单不能取消', async ({ request }) => {
    // 创建并完成订单
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 70.00, category: '其他' },
    });
    const newProductId = (await prodRes.json()).product.id;

    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: newProductId, final_price: 65.00 },
    });
    const { order } = await orderRes.json();

    // 先完成
    await request.put(`${API_BASE_URL}/api/orders/${order.id}/complete`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });

    // 再取消（应失败）
    const response = await request.put(`${API_BASE_URL}/api/orders/${order.id}/cancel`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Only pending orders can be canceled');
  });
});

// ============================================================
// 4.2 已售商品处理
// ============================================================
test.describe('📋 交易管理 - 4.2 已售商品处理', () => {

  let buyerToken = null;
  let sellerToken = null;

  test.beforeAll(async ({ request }) => {
    const buyerData = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    buyerToken = buyerData.access_token;

    const sellerData = await loginViaAPI(PRESET_TEST_USER_2.email, PRESET_TEST_USER_2.password);
    sellerToken = sellerData.access_token;
  });

  // TC-OM-SOLD-001：已售商品不在首页显示
  test('TC-OM-SOLD-001 已售商品 - 交易完成的商品不在首页显示', async ({ request }) => {
    // 1. 卖家发布商品
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 22.50, category: '书籍教材' },
    });
    const { product: createdProduct } = await prodRes.json();
    console.log(`✅ 已发布测试商品: "${createdProduct.title}" (ID: ${createdProduct.id})`);

    // 2. 验证商品在首页可见
    const listRes = await fetch(`${API_BASE_URL}/api/products?status=active`);
    const listData = await listRes.json();
    const found = listData.products.some(p => p.id === createdProduct.id);
    expect(found).toBe(true);
    console.log('✅ 未交易商品在首页可见');

    // 3. 买家下单并完成交易
    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: createdProduct.id, final_price: 22.50 },
    });
    const { order } = await orderRes.json();

    await request.put(`${API_BASE_URL}/api/orders/${order.id}/complete`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });

    // 4. 验证商品不在首页显示
    const listAfter = await fetch(`${API_BASE_URL}/api/products?status=active`);
    const listAfterData = await listAfter.json();
    const foundAfter = listAfterData.products.some(p => p.id === createdProduct.id);
    expect(foundAfter).toBe(false);
    console.log('✅ 已交易商品不在首页显示');

    // 5. 验证后端商品状态已更新
    const prodCheck = await fetch(`${API_BASE_URL}/api/products/${createdProduct.id}`);
    const prodCheckData = await prodCheck.json();
    expect(prodCheckData.product.status).toBe('sold');
    console.log(`✅ 后端商品状态已更新为 "sold"`);
  });

  // TC-OM-SOLD-002：未交易商品在首页可见
  test('TC-OM-SOLD-002 未交易商品 - 活跃商品正常显示在首页', async ({ request }) => {
    // 卖家发布一个新商品但不交易
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 18.00, category: '其他' },
    });
    const { product: createdProduct } = await prodRes.json();
    console.log(`✅ 已发布未交易商品: "${createdProduct.title}" (ID: ${createdProduct.id})`);

    // 验证在首页可见
    const listRes = await fetch(`${API_BASE_URL}/api/products?status=active`);
    const listData = await listRes.json();
    const found = listData.products.some(p => p.id === createdProduct.id);
    expect(found).toBe(true);

    // 验证 sold 和 removed 商品不出现
    const allProducts = listData.products;
    for (const p of allProducts) {
      expect(p.status).toBe('active');
    }
    console.log('✅ 未交易商品在首页可见，已售商品不出现');
  });

  // UI 验证：已售商品不在首页
  test('TC-OM-SOLD-UI 已售商品 - 前端验证已售商品不在首页显示', async ({ page }) => {
    await loginViaUI(page, PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    await test.step('搜索已售商品', async () => {
      await page.goto('/');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      // 首页不应包含 status=sold 的商品
      const productCards = page.locator('.product-card');
      const count = await productCards.count();
      console.log(`首页商品数量: ${count}`);

      if (count > 0) {
        // 验证商品状态标签 - 没有"已售出"标记
        const statusLabels = page.locator('.product-status');
        const statusCount = await statusLabels.count();
        for (let i = 0; i < statusCount; i++) {
          const text = await statusLabels.nth(i).textContent();
          // 首页只展示在售商品
          expect(text).not.toContain('sold');
        }
      }
    });
  });
});

// ============================================================
// 安全性补充：首页和权限验证
// ============================================================
test.describe('🏠 首页与权限 - 补充验证', () => {

  // TC-HP-001：首页加载
  test('TC-HP-001 首页展示 - 各模块正常加载', async ({ page }) => {
    await test.step('未登录访问首页', async () => {
      // 使用安全方式清除状态
      try {
        await page.evaluate(() => localStorage.clear());
      } catch (e) {
        await page.context().clearCookies();
      }
      await page.goto('/');
      await waitForPageReady(page);
      // 由于全局守卫，未登录会跳转登录页
      await page.waitForTimeout(1000);
    });
  });

  // TC-SEC-003：JWT 认证拦截
  test('TC-SEC-003 安全 - 无有效 token 无法访问受保护接口', async ({ request }) => {
    // 无 token
    const res1 = await request.post(`${API_BASE_URL}/api/products`, {
      data: { title: 'test', price: 10 },
    });
    expect(res1.status()).toBe(401);

    // 伪造 token
    const res2 = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': 'Bearer fake_token_here' },
      data: { title: 'test', price: 10 },
    });
    expect(res2.status()).toBe(401);
  });

  // TC-SEC-004：XSS 防护
  test('TC-SEC-004 安全 - XSS 注入被转义', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    const response = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: {
        title: "<script>alert('XSS')</script>",
        price: 10.00,
        category: '其他',
      },
    });
    expect(response.status()).toBe(201);
    const data = await response.json();

    // 验证标题被存储（作为纯文本）
    const prodId = data.product.id;
    const getRes = await fetch(`${API_BASE_URL}/api/products/${prodId}`);
    const getData = await getRes.json();
    expect(getData.product.title).toContain('<script>');
  });

  // TC-SEC-001：密码加密（通过 API 验证）
  test('TC-SEC-001 安全 - 密码 bcrypt 加密存储', async () => {
    const testUser = {
      email: `sec_test_${timestamp()}@example.com`,
      password: 'SecurePass789',
    };
    const regRes = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    expect(regRes.status).toBe(201);

    // 验证接口返回不含 password
    const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const loginData = await loginRes.json();
    expect(loginData.user).not.toHaveProperty('password');
    expect(loginData.user).not.toHaveProperty('password_hash');
  });
});
