/**
 * AI 自动化测试 - 已售商品不在首页显示
 *
 * Bug 描述：
 *   已完成交易的订单，其关联商品仍然显示在首页商品浏览列表中。
 *   预期行为：已交易的商品（status='sold'）不应出现在首页。
 *
 * 测试覆盖：
 *   1. 卖家发布商品 → 商品在首页可见
 *   2. 买家下单并完成交易 → 商品标记为已售出
 *   3. 已售商品不再出现在首页浏览中
 *   4. 验证后端商品状态已更新为 'sold'
 *
 * @see https://playwright.dev/docs/writing-tests
 *
 * 前置条件：
 *   - 后端 API 运行在 http://127.0.0.1:5000
 *   - 前端运行在 http://localhost:5173
 *   - PRESET_TEST_USER 和 PRESET_TEST_USER_2 已存在
 */

import { test, expect } from '@playwright/test';
import {
  waitForPageReady,
  PRESET_TEST_USER,
  PRESET_TEST_USER_2,
  generateTestProduct,
  loginViaAPI,
} from './test-helper.js';

const API_BASE_URL = 'http://127.0.0.1:5000';

// 生成唯一商品数据，避免测试间冲突
const testProduct = generateTestProduct();

// ============================================================
// 辅助函数
// ============================================================

/**
 * 卖家登录并发布商品
 */
async function publishProductAsSeller() {
  const tokenData = await loginViaAPI(PRESET_TEST_USER_2.email, PRESET_TEST_USER_2.password);
  const token = tokenData.access_token;

  const response = await fetch(`${API_BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: testProduct.title,
      price: testProduct.price,
      description: testProduct.description,
      category: testProduct.category,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`发布商品失败: ${data.error}`);
  }
  console.log(`✅ 卖家商品已发布: "${data.product.title}" (ID: ${data.product.id})`);
  return data.product;
}

/**
 * 买家登录并创建订单
 */
async function createOrderAsBuyer(productId, finalPrice) {
  const tokenData = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
  const token = tokenData.access_token;

  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      product_id: productId,
      final_price: finalPrice,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`创建订单失败: ${data.error}`);
  }
  console.log(`✅ 买家订单已创建 (ID: ${data.order.id}), 金额: ¥${finalPrice}`);
  return data.order;
}

/**
 * 买家确认完成订单
 */
async function completeOrderAsBuyer(orderId) {
  const tokenData = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
  const token = tokenData.access_token;

  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/complete`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`完成订单失败: ${data.error}`);
  }
  console.log(`✅ 订单 ${orderId} 已完成，商品已标记为已售出`);
  return data.order;
}

/**
 * 在首页搜索指定商品标题，返回是否找到
 */
async function searchProductOnHomepage(page, title) {
  const searchInput = page.locator('.search-input');
  await searchInput.fill(title);
  await page.click('button.search-button');
  await waitForPageReady(page);
  await page.waitForTimeout(1000);
  return page.locator('.product-card').filter({ hasText: title });
}

// ============================================================
// 测试套件
// ============================================================

test.describe('🔍 已售商品不在首页显示', () => {

  // 记录本测试使用的商品和订单
  let publishedProduct = null;
  let createdOrder = null;

  // ==========================================================
  // 1. 准备阶段：卖家发布商品
  // ==========================================================
  test('1.1 准备 - 卖家发布测试商品', async () => {
    await test.step('通过 API 发布商品（卖家账号）', async () => {
      publishedProduct = await publishProductAsSeller();
      expect(publishedProduct).toBeDefined();
      expect(publishedProduct.id).toBeGreaterThan(0);
      expect(publishedProduct.status).toBe('active');
      console.log(`✅ 商品状态为: ${publishedProduct.status}`);
    });
  });

  // ==========================================================
  // 2. 验证商品在首页可见（交易前）
  // ==========================================================
  test('2.1 验证 - 未交易商品在首页可见', async ({ page }) => {
    await test.step('买家登录', async () => {
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await waitForPageReady(page);
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', PRESET_TEST_USER.password);
      await page.click('button.login-button');
      await page.waitForURL('**/');
      await waitForPageReady(page);
    });

    await test.step('搜索刚发布的商品', async () => {
      const result = await searchProductOnHomepage(page, testProduct.title);
      await expect(result.first()).toBeVisible({ timeout: 10000 });
      console.log(`✅ 未交易商品 "${testProduct.title}" 在首页可见`);
    });
  });

  // ==========================================================
  // 3. 买家创建订单并完成交易
  // ==========================================================
  test('3.1 交易 - 买家下单并完成交易', async () => {
    await test.step('通过 API 创建订单', async () => {
      // 确保商品已发布
      if (!publishedProduct) {
        // 如果前面的测试没执行（单独运行此测试时），尝试获取商品
        const tokenData = await loginViaAPI(PRESET_TEST_USER_2.email, PRESET_TEST_USER_2.password);
        const token = tokenData.access_token;
        const resp = await fetch(`${API_BASE_URL}/api/products?seller_id=${tokenData.user.id}&status=active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();
        if (data.products && data.products.length > 0) {
          publishedProduct = data.products[0];
          console.log(`ℹ️ 获取到已有商品: "${publishedProduct.title}" (ID: ${publishedProduct.id})`);
        } else {
          // 没有可用商品，发布一个新商品
          publishedProduct = await publishProductAsSeller();
        }
      }

      const orderPrice = (parseFloat(publishedProduct.price) * 0.9).toFixed(2);
      createdOrder = await createOrderAsBuyer(publishedProduct.id, orderPrice);
      expect(createdOrder).toBeDefined();
      expect(createdOrder.id).toBeGreaterThan(0);
      expect(createdOrder.status).toBe('pending');
    });

    await test.step('通过 API 完成订单（买家确认收货）', async () => {
      if (!createdOrder) {
        throw new Error('订单未创建，无法完成交易');
      }
      const completedOrder = await completeOrderAsBuyer(createdOrder.id);
      expect(completedOrder.status).toBe('completed');
    });

    await test.step('验证后端商品状态已更新为 sold', async () => {
      const resp = await fetch(`${API_BASE_URL}/api/products/${publishedProduct.id}`);
      const data = await resp.json();
      expect(data.product.status).toBe('sold');
      console.log(`✅ 后端验证：商品状态已更新为 "sold"`);
    });
  });

  // ==========================================================
  // 4. 验证已售商品不在首页显示
  // ==========================================================
  test('4.1 验证 - 已交易商品不在首页显示', async ({ page }) => {
    await test.step('买家重新登录', async () => {
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await waitForPageReady(page);
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', PRESET_TEST_USER.password);
      await page.click('button.login-button');
      await page.waitForURL('**/');
      await waitForPageReady(page);
    });

    await test.step('搜索已售出的商品', async () => {
      const result = await searchProductOnHomepage(page, testProduct.title);

      // 验证已售商品不在首页搜索结果中
      const count = await result.count();
      expect(count).toBe(0);
      console.log(`✅ 已交易商品 "${testProduct.title}" 不在首页显示`);

      // 验证显示"暂无商品"提示
      const noProducts = page.locator('.no-products');
      // 如果搜索不到商品，应该显示空状态提示
      if (count === 0) {
        const isEmptyVisible = await noProducts.isVisible().catch(() => false);
        if (isEmptyVisible) {
          console.log('✅ 页面正确显示空状态提示');
        }
      }
    });

    await test.step('验证首页商品列表不包含已售商品', async () => {
      // 清除搜索条件，查看全部商品列表
      const searchInput = page.locator('.search-input');
      await searchInput.fill('');
      await page.click('button.search-button');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      // 遍历所有商品卡片，确认没有一个是被标记为已售的
      const productCards = page.locator('.product-card');
      const cardCount = await productCards.count();
      let foundSold = false;

      for (let i = 0; i < cardCount; i++) {
        const title = await productCards.nth(i).locator('h4').textContent();
        if (title === testProduct.title) {
          foundSold = true;
          console.log(`❌ 错误：已售商品 "${title}" 仍出现在首页！`);
        }
      }

      expect(foundSold).toBe(false);
      console.log(`✅ 验证通过：首页 ${cardCount} 个商品中不包含已售商品`);
    });
  });
});
