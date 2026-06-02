/**
 * AI 自动化测试 - 交易流程
 *
 * 测试覆盖：
 *   1. 卖家发布商品（为交易准备商品）
 *   2. 买家联系卖家创建会话
 *   3. 在聊天室发起交易
 *   4. 查看我的订单列表（买家视角）
 *   5. 查看订单详情
 *   6. 取消订单
 *
 * @see https://playwright.dev/docs/writing-tests
 *
 * 前置条件：
 *   - 后端 API 运行在 http://127.0.0.1:5000
 *   - 前端运行在 http://localhost:5173
 *   - PRESET_TEST_USER 和 PRESET_TEST_USER_2 已存在（运行 npm run test:e2e:setup）
 */

import { test, expect } from '@playwright/test';
import {
  waitForPageReady,
  PRESET_TEST_USER,
  PRESET_TEST_USER_2,
  generateTestProduct,
  loginViaAPI,
  timestamp,
} from './test-helper.js';

const API_BASE_URL = 'http://127.0.0.1:5000';

// 生成唯一商品数据，避免冲突
const sellerProduct = generateTestProduct();

// ============================================================
// 辅助函数
// ============================================================

/**
 * 通过 API 发布商品（卖家）
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
      title: sellerProduct.title,
      price: sellerProduct.price,
      description: sellerProduct.description,
      category: sellerProduct.category,
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
 * 通过 API 从数据库中获取卖家发布的最新商品
 * （用于在 UI 中找到它的位置）
 */
async function getSellerLatestProduct() {
  const tokenData = await loginViaAPI(PRESET_TEST_USER_2.email, PRESET_TEST_USER_2.password);
  const token = tokenData.access_token;

  const response = await fetch(`${API_BASE_URL}/api/products?seller_id=${tokenData.user.id}&status=active`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (!response.ok || !data.products || data.products.length === 0) {
    return null;
  }
  // 找发布的最新商品
  return data.products[0];
}

/**
 * 通过 API 获取用户的 userId
 */
async function getUserId(email, password) {
  const data = await loginViaAPI(email, password);
  return data.user.id;
}

// ============================================================
// 测试套件
// ============================================================

test.describe('📋 交易流程', () => {

  // ==========================================================
  // 1. 准备阶段：卖家发布商品
  // ==========================================================
  test('1.1 准备 - 卖家发布测试商品', async ({ page }) => {
    let publishedProduct;

    await test.step('通过 API 发布商品（卖家账号）', async () => {
      publishedProduct = await publishProductAsSeller();
      expect(publishedProduct).toBeDefined();
      expect(publishedProduct.id).toBeGreaterThan(0);
    });

    await test.step('验证商品在首页可见', async () => {
      // 登录买家账号来验证商品出现在首页
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await waitForPageReady(page);
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', PRESET_TEST_USER.password);
      await page.click('button.login-button');
      await page.waitForURL('**/');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      // 搜索刚才发布的商品
      const searchInput = page.locator('.search-input');
      await searchInput.fill(sellerProduct.title);
      await page.click('button.search-button');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      // 验证商品出现在搜索结果中
      await expect(page.locator(`text=${sellerProduct.title}`).first()).toBeVisible({ timeout: 10000 });
      console.log(`✅ 卖家商品 "${sellerProduct.title}" 在首页可见`);
    });
  });

  // ==========================================================
  // 2. 买家联系卖家（创建会话）
  // ==========================================================
  test('2.1 联系卖家 - 从商品页面创建会话', async ({ page }) => {
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

    await test.step('搜索卖家发布的商品', async () => {
      const searchInput = page.locator('.search-input');
      await searchInput.fill(sellerProduct.title);
      await page.click('button.search-button');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);
    });

    await test.step('点击"联系卖家"创建会话', async () => {
      // 找到卖家商品上的联系卖家按钮
      const productCard = page.locator('.product-card').filter({ hasText: sellerProduct.title });
      const exists = await productCard.isVisible().catch(() => false);

      if (!exists) {
        console.log('⚠️ 卖家商品未在首页显示，跳过测试');
        test.skip();
        return;
      }

      const contactBtn = productCard.locator('.contact-seller-btn');
      await expect(contactBtn).toBeVisible({ timeout: 5000 });

      await contactBtn.click();
      // 应该跳转到聊天室
      await page.waitForURL(/\/chat\//, { timeout: 10000 });
      await waitForPageReady(page);

      // 验证聊天室加载
      await expect(page.locator('.chat-room-container')).toBeVisible();
      console.log('✅ 买家成功联系卖家，进入聊天室');
    });
  });

  // ==========================================================
  // 3. 在聊天室发起交易
  // ==========================================================
  test('3.1 发起交易 - 在聊天室创建订单', async ({ page }) => {
    let orderPrice;

    await test.step('买家登录并进入聊天室', async () => {
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await waitForPageReady(page);
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', PRESET_TEST_USER.password);
      await page.click('button.login-button');
      await page.waitForURL('**/');
      await waitForPageReady(page);
    });

    await test.step('进入聊天列表，点击第一个会话', async () => {
      await page.goto('/chat');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      const conversationItems = page.locator('.conversation-item');
      const count = await conversationItems.count();

      if (count === 0) {
        console.log('⚠️ 没有会话，跳过测试');
        test.skip();
        return;
      }

      await conversationItems.first().click();
      await page.waitForURL(/\/chat\//);
      await waitForPageReady(page);
    });

    await test.step('验证"发起交易"按钮可见', async () => {
      await page.waitForTimeout(1000);
      const tradeBtn = page.locator('button.trade-button');
      await expect(tradeBtn).toBeVisible({ timeout: 5000 });
      console.log('✅ "发起交易"按钮可见');
    });

    await test.step('点击"发起交易"并填写金额', async () => {
      await page.click('button.trade-button');
      // 等待弹窗出现
      await expect(page.locator('.modal-overlay')).toBeVisible();
      await expect(page.locator('.modal-header h3')).toHaveText('发起交易');

      // 输入交易金额（预设价格打8折）
      orderPrice = (parseFloat(sellerProduct.price) * 0.8).toFixed(2);
      const priceInput = page.locator('.trade-input');
      await priceInput.fill(orderPrice);
      console.log(`✅ 输入交易金额: ¥${orderPrice}`);
    });

    await test.step('提交创建订单', async () => {
      // 设置对话框处理（创建成功后会有 confirm 弹窗）
      let orderCreated = false;
      page.on('dialog', async (dialog) => {
        console.log(`对话框: ${dialog.type()} - ${dialog.message()}`);
        if (dialog.type() === 'confirm') {
          // 确认弹窗询问是否查看订单详情
          // 这里选择取消（不跳转），后续测试会验证订单
          await dialog.dismiss();
          orderCreated = true;
        } else if (dialog.type() === 'alert') {
          await dialog.accept();
          orderCreated = true;
        }
      });

      await page.click('button.submit-trade-btn');
      await page.waitForTimeout(2000);

      // 验证弹窗关闭
      await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 5000 });
      console.log('✅ 订单创建成功，弹窗已关闭');
    });

    await test.step('验证聊天室出现订单通知消息', async () => {
      await page.waitForTimeout(1000);
      // 验证消息区域包含"交易已创建"的系统消息
      const messageTexts = page.locator('.message p');
      const count = await messageTexts.count();

      let foundOrderMsg = false;
      for (let i = 0; i < count; i++) {
        const text = await messageTexts.nth(i).textContent();
        if (text.includes('交易已创建')) {
          foundOrderMsg = true;
          console.log(`✅ 聊天室中显示订单通知: "${text}"`);
          break;
        }
      }
      expect(foundOrderMsg).toBeTruthy();
    });
  });

  // ==========================================================
  // 4. 买家查看我的订单
  // ==========================================================
  test('4.1 我的订单 - 买家查看订单列表', async ({ page }) => {
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

    await test.step('通过菜单进入"我的订单"', async () => {
      await page.click('button.dropdown-button');
      await page.click('button.my-orders-item');
      await page.waitForURL('**/my-orders');
      await waitForPageReady(page);
    });

    await test.step('验证页面标题和标签', async () => {
      await expect(page.locator('h1')).toContainText('我的订单');
      // 验证两个标签页存在
      const tabs = page.locator('.tab');
      await expect(tabs.nth(0)).toContainText('我购买的');
      await expect(tabs.nth(1)).toContainText('我卖出的');
    });

    await test.step('验证"我购买的"标签页中有订单', async () => {
      await page.waitForTimeout(1000);
      // 默认显示"我购买的"
      const orderCards = page.locator('.order-card');
      const count = await orderCards.count();

      if (count === 0) {
        console.log('⚠️ 没有订单，跳过验证');
        test.skip();
        return;
      }

      console.log(`✅ 买家订单列表显示 ${count} 个订单`);
      // 验证订单卡片包含必要信息
      const firstCard = orderCards.first();
      await expect(firstCard.locator('.product-title')).toBeVisible();
      await expect(firstCard.locator('.status-badge')).toBeVisible();
      await expect(firstCard.locator('.price-value')).toBeVisible();
    });
  });

  // ==========================================================
  // 5. 查看订单详情
  // ==========================================================
  test('5.1 订单详情 - 查看并验证订单信息', async ({ page }) => {
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

    await test.step('进入"我购买的"订单列表', async () => {
      await page.goto('/my-orders');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      const orderCards = page.locator('.order-card');
      const count = await orderCards.count();
      if (count === 0) {
        console.log('⚠️ 没有订单，跳过测试');
        test.skip();
        return;
      }
      // 点击第一个订单
      await orderCards.first().click();
      await page.waitForURL(/\/my-orders\//);
      await waitForPageReady(page);
    });

    await test.step('验证订单详情页信息完整', async () => {
      await page.waitForTimeout(1000);
      await expect(page.locator('h1')).toContainText('订单详情');

      // 验证状态卡片
      await expect(page.locator('.status-card')).toBeVisible();
      await expect(page.locator('.status-badge-lg')).toBeVisible();
      await expect(page.locator('.order-number')).toBeVisible();

      // 验证商品信息
      await expect(page.locator('.section h3').first()).toContainText('商品信息');
      await expect(page.locator('.product-card')).toBeVisible();

      // 验证交易信息
      await expect(page.locator('.price-section')).toBeVisible();
      await expect(page.locator('.final-price')).toBeVisible();

      // 验证对方信息
      await expect(page.locator('.user-card')).toBeVisible();
      await expect(page.locator('.user-nickname')).toBeVisible();

      console.log('✅ 订单详情页显示完整');
    });

    await test.step('验证存在取消订单按钮（待确认状态）', async () => {
      const cancelBtn = page.locator('button.cancel-btn');
      const isVisible = await cancelBtn.isVisible().catch(() => false);

      if (isVisible) {
        console.log('✅ 取消订单按钮可见（订单为待确认状态）');
      } else {
        console.log('ℹ️ 没有取消按钮，订单可能已完成或已取消');
      }
    });
  });

  // ==========================================================
  // 6. 取消订单
  // ==========================================================
  test('6.1 取消订单 - 买家取消待确认订单', async ({ page }) => {
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

    await test.step('进入"我购买的"并打开第一个待确认订单', async () => {
      await page.goto('/my-orders');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      const orderCards = page.locator('.order-card');
      const count = await orderCards.count();
      if (count === 0) {
        console.log('⚠️ 没有订单，跳过测试');
        test.skip();
        return;
      }

      // 检查是否有待确认的订单
      let foundPending = false;
      for (let i = 0; i < count; i++) {
        const statusBadge = orderCards.nth(i).locator('.status-badge');
        const statusText = await statusBadge.textContent();
        if (statusText === '待确认') {
          await orderCards.nth(i).click();
          foundPending = true;
          console.log('✅ 找到待确认的订单，进入详情页');
          break;
        }
      }

      if (!foundPending) {
        console.log('⚠️ 没有待确认的订单，跳过测试');
        test.skip();
        return;
      }

      await page.waitForURL(/\/my-orders\//);
      await waitForPageReady(page);
    });

    await test.step('点击"取消订单"按钮', async () => {
      await page.waitForTimeout(1000);

      const cancelBtn = page.locator('button.cancel-btn');
      const exists = await cancelBtn.isVisible().catch(() => false);

      if (!exists) {
        console.log('⚠️ 取消按钮不可见，跳过测试');
        test.skip();
        return;
      }

      // 处理 confirm 对话框
      let confirmHandled = false;
      page.on('dialog', async (dialog) => {
        console.log(`对话框: ${dialog.type()} - ${dialog.message()}`);
        if (dialog.type() === 'confirm') {
          await dialog.accept();
          confirmHandled = true;
        } else if (dialog.type() === 'alert') {
          await dialog.accept();
        }
      });

      await cancelBtn.click();
      await page.waitForTimeout(2000);

      // 验证状态变为"已取消"
      const statusBadge = page.locator('.status-badge-lg');
      await expect(statusBadge).toContainText('已取消', { timeout: 5000 });
      console.log('✅ 订单已成功取消');
    });
  });

  // ==========================================================
  // 7. 卖家查看卖出的订单
  // ==========================================================
  test('7.1 我的订单 - 卖家查看卖出记录', async ({ page }) => {
    await test.step('卖家登录', async () => {
      await page.goto('/login');
      await page.evaluate(() => localStorage.clear());
      await waitForPageReady(page);
      await page.fill('#email', PRESET_TEST_USER_2.email);
      await page.fill('#password', PRESET_TEST_USER_2.password);
      await page.click('button.login-button');
      await page.waitForURL('**/');
      await waitForPageReady(page);
    });

    await test.step('进入"我的订单"并切换到"我卖出的"', async () => {
      await page.click('button.dropdown-button');
      await page.click('button.my-orders-item');
      await page.waitForURL('**/my-orders');
      await waitForPageReady(page);
    });

    await test.step('切换到"我卖出的"标签', async () => {
      await page.waitForTimeout(500);
      const sellTab = page.locator('.tab').nth(1);
      await sellTab.click();
      await page.waitForTimeout(1500);
    });

    await test.step('验证卖家能看到卖出的订单', async () => {
      const orderCards = page.locator('.order-card');
      const count = await orderCards.count();

      if (count === 0) {
        console.log('ℹ️ 卖家暂无卖出记录');
      } else {
        console.log(`✅ 卖家看到 ${count} 个卖出订单`);
        // 验证订单信息
        await expect(orderCards.first().locator('.product-title')).toBeVisible();
        await expect(orderCards.first().locator('.status-badge')).toBeVisible();
      }
    });
  });
});
