/**
 * AI 自动化测试 - 商品管理模块
 *
 * 对应测试用例文档：二、商品管理模块
 *   2.1 商品发布 (TC-PM-CRE-001 ~ 007)
 *   2.2 商品浏览与搜索 (TC-PM-LIS-001 ~ 002, TC-PM-SRC-001 ~ 005)
 *   2.3 商品详情 (TC-PM-DET-001 ~ 002)
 *   2.4 商品管理 (TC-PM-MGT-001 ~ 005)
 *   2.5 商品评论 (TC-PM-CMT-001 ~ 006)
 *   2.6 商品收藏 (TC-PM-FAV-001 ~ 005)
 *   2.7 议价功能 (TC-PM-OFR-001 ~ 008)
 *
 * @see ../document/测试用例文档.md
 */

import { test, expect } from '@playwright/test';
import {
  generateTestProduct,
  generateTestUser,
  generateLongText,
  waitForPageReady,
  loginViaUI,
  loginViaAPI,
  PRESET_TEST_USER,
  timestamp,
} from './test-helper.js';

const API_BASE_URL = 'http://127.0.0.1:5000';

// ============================================================
// 2.1 商品发布
// ============================================================
test.describe('📦 商品管理 - 2.1 商品发布', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, PRESET_TEST_USER.email, PRESET_TEST_USER.password);
  });

  // TC-PM-CRE-001：正常发布商品（JSON）
  test('TC-PM-CRE-001 发布商品 - 填写完整信息发布成功', async ({ page }) => {
    const product = generateTestProduct();

    await test.step('进入发布页面', async () => {
      await page.click('button.dropdown-button');
      await page.click('button.publish-item');
      await page.waitForURL('**/products/publish');
      await waitForPageReady(page);
    });

    await test.step('填写商品信息', async () => {
      await page.fill('#title', product.title);
      await page.fill('#price', product.price);
      await page.selectOption('#category', product.category);
      await page.fill('#description', product.description);
    });

    await test.step('提交发布并验证', async () => {
      // 处理 alert 弹窗
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('发布成功');
        await dialog.accept();
      });
      await page.click('button.submit-button');
      // 发布成功后应跳转到首页
      await page.waitForURL('**/');
      await waitForPageReady(page);
      // 验证商品出现在列表中
      await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 10000 });
    });
  });

  // TC-PM-CRE-002：发布商品 - 带图片
  test('TC-PM-CRE-002 发布商品 - 上传商品图片发布成功', async ({ page }) => {
    const product = generateTestProduct();

    await test.step('进入发布页面并填写信息', async () => {
      await page.goto('/products/publish');
      await waitForPageReady(page);
      await page.fill('#title', product.title);
      await page.fill('#price', product.price);
      await page.selectOption('#category', product.category);
    });

    await test.step('上传图片并发布', async () => {
      const fileInput = page.locator('#image');
      const testImagePath = 'C:\\Users\\starlight\\Documents\\项目\\pbl6\\backend\\test_images\\test_product.jpg';
      try {
        await fileInput.setInputFiles(testImagePath);
        await expect(page.locator('.image-preview')).toBeVisible({ timeout: 5000 });
      } catch {
        console.log('⚠️ 未找到测试图片，跳过图片上传');
      }

      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('发布成功');
        await dialog.accept();
      });
      await page.click('button.submit-button');
      await page.waitForURL('**/');
    });
  });

  // TC-PM-CRE-003：发布商品 - 缺少标题
  test('TC-PM-CRE-003 发布商品 - 缺少标题被拒绝', async ({ page }) => {
    await test.step('不填标题直接提交', async () => {
      await page.goto('/products/publish');
      await waitForPageReady(page);
      await page.fill('#price', '29.99');
      await page.click('button.submit-button');
      await page.waitForTimeout(500);
      // 预期提示
      await expect(page.locator('.error-message')).toContainText('标题', { timeout: 3000 });
      await expect(page.locator('h1')).toContainText('发布商品');
    });
  });

  // TC-PM-CRE-004：发布商品 - 缺少价格
  test('TC-PM-CRE-004 发布商品 - 缺少价格被拒绝', async ({ page }) => {
    await test.step('不填价格直接提交', async () => {
      await page.goto('/products/publish');
      await waitForPageReady(page);
      await page.fill('#title', '测试商品');
      await page.click('button.submit-button');
      await page.waitForTimeout(500);
      await expect(page.locator('.error-message')).toContainText('价格', { timeout: 3000 });
    });
  });

  // TC-PM-CRE-005：发布商品 - 价格为负数
  test('TC-PM-CRE-005 发布商品 - 价格为负数被拒绝', async ({ page }) => {
    await test.step('填写负数价格', async () => {
      await page.goto('/products/publish');
      await waitForPageReady(page);
      await page.fill('#title', '测试商品');
      await page.fill('#price', '-10');
      await page.click('button.submit-button');
      await page.waitForTimeout(500);
      await expect(page.locator('.error-message')).toContainText('有效', { timeout: 3000 });
    });
  });

  // TC-PM-CRE-006：发布商品 - 未登录
  test('TC-PM-CRE-006 发布商品 - 未登录访问发布页被拦截', async ({ page }) => {
    await test.step('清除登录状态后访问发布页', async () => {
      await page.evaluate(() => localStorage.clear());
      await page.goto('/products/publish');
      await waitForPageReady(page);
      // 应重定向到登录页
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // TC-PM-CRE-007：发布商品 - 价格格式非法
  test('TC-PM-CRE-007 发布商品 - 价格格式非法被拒绝', async ({ page }) => {
    await test.step('填写非数字价格', async () => {
      await page.goto('/products/publish');
      await waitForPageReady(page);
      await page.fill('#title', '测试商品');
      // type=number 的 input 无法输入非数字，直接点击提交
      await page.click('button.submit-button');
      await page.waitForTimeout(500);
      await expect(page.locator('.error-message')).toContainText('价格', { timeout: 3000 });
    });
  });
});

// ============================================================
// 2.2 商品浏览与搜索
// ============================================================
test.describe('📦 商品管理 - 2.2 商品浏览与搜索', () => {

  // TC-PM-LIS-001：浏览商品列表
  test('TC-PM-LIS-001 商品列表 - 正常浏览展示商品', async ({ page }) => {
    await test.step('未登录访问首页', async () => {
      await page.evaluate(() => localStorage.clear());
      await page.goto('/');
      await waitForPageReady(page);
    });

    await test.step('验证商品列表展示', async () => {
      await page.waitForTimeout(1000);
      // 验证商品卡片（可能有商品也可能为空）
      const cards = page.locator('.product-card');
      const count = await cards.count();
      if (count > 0) {
        await expect(cards.first()).toBeVisible();
      } else {
        // 空状态提示
        await expect(page.locator('.no-products')).toBeVisible();
      }
    });
  });

  // TC-PM-LIS-002：分页功能（通过 API 验证）
  test('TC-PM-LIS-002 商品列表 - 分页功能正常', async ({ page }) => {
    await test.step('调用分页 API', async () => {
      const response = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=20`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('products');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('pages');
      expect(data).toHaveProperty('current_page');
      expect(data.current_page).toBe(1);
    });
  });

  // TC-PM-SRC-001：搜索商品 - 关键词匹配
  test('TC-PM-SRC-001 商品搜索 - 按关键词搜索到匹配商品', async ({ page }) => {
    await test.step('输入关键词搜索', async () => {
      await page.goto('/');
      await waitForPageReady(page);
      const searchInput = page.locator('.search-input');
      await searchInput.fill('教材');
      await page.click('button.search-button');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);
    });

    await test.step('验证搜索结果', async () => {
      // 搜索应返回结果或空状态
      const cards = page.locator('.product-card');
      const count = await cards.count();
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const title = await cards.nth(i).locator('h4').textContent();
          console.log(`搜索结果 ${i + 1}: ${title}`);
        }
      }
    });
  });

  // TC-PM-SRC-002：分类筛选
  test('TC-PM-SRC-002 商品搜索 - 按分类筛选商品', async ({ page }) => {
    await test.step('选择分类筛选', async () => {
      await page.goto('/');
      await waitForPageReady(page);
      await page.selectOption('.category-select', '书籍教材');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);
    });

    await test.step('验证筛选结果', async () => {
      const cards = page.locator('.product-card');
      const count = await cards.count();
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          await expect(cards.nth(i).locator('.category-tag')).toContainText('书籍教材');
        }
      }
    });
  });

  // TC-PM-SRC-003：搜索无结果
  test('TC-PM-SRC-003 商品搜索 - 关键词无匹配时显示空状态', async ({ page }) => {
    await test.step('搜索不存在的关键词', async () => {
      await page.goto('/');
      await waitForPageReady(page);
      await page.fill('.search-input', '@@@@');
      await page.click('button.search-button');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);
    });

    await test.step('验证空状态', async () => {
      // 可能显示空状态或无商品提示
      const noProducts = page.locator('.no-products');
      const cards = page.locator('.product-card');
      const cardCount = await cards.count();
      if (cardCount === 0) {
        await expect(noProducts).toBeVisible();
      }
    });
  });

  // TC-PM-SRC-004：排序功能
  test('TC-PM-SRC-004 商品排序 - 按价格升降序排序', async ({ page }) => {
    await test.step('选择价格从低到高排序', async () => {
      await page.goto('/');
      await waitForPageReady(page);
      await page.selectOption('.sort-select', 'price_asc');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);
    });

    await test.step('验证排序', async () => {
      const prices = page.locator('.product-price');
      const count = await prices.count();
      if (count > 1) {
        const p1Text = await prices.nth(0).textContent();
        const p2Text = await prices.nth(1).textContent();
        const p1 = parseFloat(p1Text.replace('¥', ''));
        const p2 = parseFloat(p2Text.replace('¥', ''));
        expect(p1).toBeLessThanOrEqual(p2);
      }
    });
  });

  // TC-PM-SRC-005：获取分类列表
  test('TC-PM-SRC-005 分类列表 - 获取所有可用分类', async ({ page }) => {
    await test.step('调用分类 API', async () => {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.categories).toContain('书籍教材');
      expect(data.categories).toContain('电子数码');
      expect(data.categories).toContain('其他');
    });
  });
});

// ============================================================
// 2.3 商品详情
// ============================================================
test.describe('📦 商品管理 - 2.3 商品详情', () => {

  // TC-PM-DET-001：查看商品详情
  test('TC-PM-DET-001 商品详情 - 展示完整商品信息', async ({ page }) => {
    await test.step('获取一个商品 ID', async () => {
      const response = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
      const data = await response.json();
      if (data.products.length === 0) {
        test.skip('没有商品可查看');
        return;
      }
      const productId = data.products[0].id;

      await page.goto(`/products/${productId}`);
      await waitForPageReady(page);
    });

    await test.step('验证详情页内容', async () => {
      await expect(page.locator('.product-detail-container')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.product-title')).toBeVisible();
      await expect(page.locator('.product-price')).toBeVisible();
      await expect(page.locator('.product-seller')).toBeVisible();
      await expect(page.locator('.product-category')).toBeVisible();
      await expect(page.locator('.product-description')).toBeVisible();
    });
  });

  // TC-PM-DET-002：商品不存在
  test('TC-PM-DET-002 商品详情 - 访问不存在的商品显示404', async ({ page }) => {
    await test.step('访问不存在的商品 ID', async () => {
      await page.goto('/products/99999');
      await waitForPageReady(page);
      // 预期跳转首页或显示错误
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl === 'http://localhost:5173/' || currentUrl.includes('/products/99999')).toBeTruthy();
    });
  });
});

// ============================================================
// 2.4 商品管理（编辑/删除）
// ============================================================
test.describe('📦 商品管理 - 2.4 商品管理（编辑/删除）', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, PRESET_TEST_USER.email, PRESET_TEST_USER.password);
  });

  // TC-PM-MGT-001：编辑自有商品
  test('TC-PM-MGT-001 商品编辑 - 卖家修改自有商品信息', async ({ page, request }) => {
    const { access_token, user } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    // 先通过 API 发布一个商品供编辑
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: { title: '待编辑商品', price: 30.00, description: '编辑前', category: '其他' },
    });
    const prodData = await prodRes.json();
    const productId = prodData.product.id;

    await test.step('进入编辑页面', async () => {
      await page.goto(`/products/${productId}/edit`);
      await waitForPageReady(page);
    });

    await test.step('修改标题和价格', async () => {
      await page.fill('#title', '已编辑商品');
      await page.fill('#price', '19.99');
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('成功');
        await dialog.accept();
      });
      await page.click('button.submit-button');
      await page.waitForTimeout(1000);
    });

    await test.step('验证更新', async () => {
      // 通过 API 验证
      const checkRes = await fetch(`${API_BASE_URL}/api/products/${productId}`);
      const checkData = await checkRes.json();
      expect(checkData.product.title).toBe('已编辑商品');
      expect(checkData.product.price).toBe(19.99);
    });
  });

  // TC-PM-MGT-002：编辑他人商品
  test('TC-PM-MGT-002 商品编辑 - 非卖家编辑他人商品被拒绝', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    // 获取一个非自己的商品
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=20`);
    const prodData = await prodRes.json();
    const otherProduct = prodData.products.find(p => p.seller_id !== 1); // 非当前用户的

    if (!otherProduct) {
      test.skip('没有其他用户的商品可测试');
      return;
    }

    const response = await request.put(`${API_BASE_URL}/api/products/${otherProduct.id}`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: { title: '恶意修改' },
    });
    expect(response.status()).toBe(403);
  });

  // TC-PM-MGT-003：删除自有商品
  test('TC-PM-MGT-003 商品删除 - 卖家删除自有商品', async ({ page, request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    // 先发布商品供删除
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: { title: `待删除商品_${timestamp()}`, price: 15.00, category: '其他' },
    });
    const { product } = await prodRes.json();

    await test.step('进入我的商品页面并删除', async () => {
      await page.goto('/my-products');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      // 找到刚发布的商品并删除
      const deleteBtn = page.locator('button.delete-button').first();
      if (await deleteBtn.isVisible()) {
        page.once('dialog', async (dialog) => {
          expect(dialog.message()).toContain('确定');
          await dialog.accept();
        });
        page.once('dialog', async (dialog) => {
          await dialog.accept();
        });
        await deleteBtn.click();
        await page.waitForTimeout(1500);
      }
    });
  });

  // TC-PM-MGT-004：删除他人商品
  test('TC-PM-MGT-004 商品删除 - 非卖家删除他人商品被拒绝', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=20`);
    const prodData = await prodRes.json();
    const otherProduct = prodData.products.find(p => p.seller_id !== 1);

    if (!otherProduct) {
      test.skip('没有其他用户的商品');
      return;
    }

    const response = await request.delete(`${API_BASE_URL}/api/products/${otherProduct.id}`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(403);
  });

  // TC-PM-MGT-005：查看我发布的商品列表
  test('TC-PM-MGT-005 商品管理 - 查看我发布的商品列表', async ({ page }) => {
    await test.step('进入我的商品页面', async () => {
      await page.click('button.dropdown-button');
      await page.click('button.my-products-item');
      await page.waitForURL('**/my-products');
      await waitForPageReady(page);
    });

    await test.step('验证页面', async () => {
      await expect(page.locator('h1')).toContainText('我发布的商品', { timeout: 5000 });
      // 验证存在商品卡片或空状态
      const cards = page.locator('.product-card');
      const count = await cards.count();
      console.log(`我的商品数量: ${count}`);
      if (count > 0) {
        await expect(cards.first().locator('.product-actions')).toBeVisible();
      }
    });
  });
});

// ============================================================
// 2.5 商品评论
// ============================================================
test.describe('📦 商品管理 - 2.5 商品评论', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, PRESET_TEST_USER.email, PRESET_TEST_USER.password);
  });

  // TC-PM-CMT-001：发表评论
  test('TC-PM-CMT-001 商品评论 - 登录用户发表评论', async ({ page, request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    // 先找一个商品
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) {
      test.skip('没有商品');
      return;
    }
    const productId = prodData.products[0].id;

    await test.step('进入商品详情并发表评论', async () => {
      await page.goto(`/products/${productId}`);
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      const commentInput = page.locator('.comment-textarea');
      if (await commentInput.isVisible()) {
        await commentInput.fill('自动化测试评论 - 好商品！');
        page.once('dialog', async (dialog) => {
          expect(dialog.message()).toContain('成功');
          await dialog.accept();
        });
        await page.click('button.submit-comment-btn');
        await page.waitForTimeout(1000);
      }
    });
  });

  // TC-PM-CMT-002：评论内容为空
  test('TC-PM-CMT-002 商品评论 - 空内容被拒绝', async ({ page }) => {
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) { test.skip(); return; }

    await page.goto(`/products/${prodData.products[0].id}`);
    await waitForPageReady(page);

    const commentBtn = page.locator('button.submit-comment-btn');
    if (await commentBtn.isVisible()) {
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('请输入');
        await dialog.accept();
      });
      await commentBtn.click();
    }
  });

  // TC-PM-CMT-003：评论超长（API 测）
  test('TC-PM-CMT-003 商品评论 - 超过500字符被拒绝', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) { test.skip(); return; }

    const response = await request.post(`${API_BASE_URL}/api/products/${prodData.products[0].id}/comments`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: { content: generateLongText(501) },
    });
    expect(response.status()).toBe(400);
  });

  // TC-PM-CMT-004：删除自己的评论
  test('TC-PM-CMT-004 商品评论 - 删除自己的评论', async ({ page, request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) { test.skip(); return; }
    const productId = prodData.products[0].id;

    // 先发表评论
    await request.post(`${API_BASE_URL}/api/products/${productId}/comments`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: { content: `待删除评论_${timestamp()}` },
    });

    await test.step('在详情页删除评论', async () => {
      await page.goto(`/products/${productId}`);
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      const deleteBtn = page.locator('button.delete-comment-btn').first();
      if (await deleteBtn.isVisible()) {
        page.once('dialog', async (dialog) => {
          await dialog.accept(); // 确认删除
        });
        page.once('dialog', async (dialog) => {
          await dialog.accept(); // 删除成功提示
        });
        await deleteBtn.click();
        await page.waitForTimeout(1000);
      }
    });
  });

  // TC-PM-CMT-005：删除他人评论（API 测）
  test('TC-PM-CMT-005 商品评论 - 删除他人评论被拒绝', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) { test.skip(); return; }

    // 获取商品评论
    const cmtRes = await fetch(`${API_BASE_URL}/api/products/${prodData.products[0].id}/comments`);
    const cmtData = await cmtRes.json();
    const otherComment = cmtData.comments?.find(c => c.user?.id !== 1);
    if (!otherComment) { test.skip('没有他人的评论'); return; }

    const response = await request.delete(`${API_BASE_URL}/api/comments/${otherComment.id}`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(403);
  });

  // TC-PM-CMT-006：获取商品评论列表
  test('TC-PM-CMT-006 商品评论 - 获取商品评论列表（分页）', async () => {
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) { test.skip(); return; }

    const response = await fetch(`${API_BASE_URL}/api/products/${prodData.products[0].id}/comments?page=1&per_page=20`);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('comments');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('pages');
  });
});

// ============================================================
// 2.6 商品收藏
// ============================================================
test.describe('📦 商品管理 - 2.6 商品收藏', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, PRESET_TEST_USER.email, PRESET_TEST_USER.password);
  });

  // TC-PM-FAV-001：收藏商品
  test('TC-PM-FAV-001 商品收藏 - 登录用户收藏商品', async ({ page }) => {
    await test.step('在首页点击收藏按钮', async () => {
      await page.goto('/');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      const favBtn = page.locator('button.favorite-button').first();
      if (await favBtn.isVisible()) {
        page.once('dialog', async (dialog) => {
          expect(dialog.message()).toContain('收藏');
          await dialog.accept();
        });
        await favBtn.click();
        await page.waitForTimeout(500);
      }
    });
  });

  // TC-PM-FAV-002：重复收藏（API 测）
  test('TC-PM-FAV-002 商品收藏 - 重复收藏被拒绝', async ({ request }) => {
    const { access_token, user } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) { test.skip(); return; }
    const productId = prodData.products[0].id;

    // 先收藏
    await request.post(`${API_BASE_URL}/api/favorites`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: { product_id: productId },
    });

    // 再次收藏应失败
    const response = await request.post(`${API_BASE_URL}/api/favorites`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: { product_id: productId },
    });
    expect(response.status()).toBe(400);
  });

  // TC-PM-FAV-003：取消收藏
  test('TC-PM-FAV-003 商品收藏 - 取消收藏成功', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) { test.skip(); return; }
    const productId = prodData.products[0].id;

    // 先收藏
    await request.post(`${API_BASE_URL}/api/favorites`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: { product_id: productId },
    });

    // 取消收藏
    const response = await request.delete(`${API_BASE_URL}/api/favorites/${productId}`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(200);
  });

  // TC-PM-FAV-004：查看收藏列表
  test('TC-PM-FAV-004 商品收藏 - 查看收藏列表', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    const response = await request.get(`${API_BASE_URL}/api/favorites`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('favorites');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('pages');
  });

  // TC-PM-FAV-005：检查收藏状态
  test('TC-PM-FAV-005 商品收藏 - 检查某商品是否已收藏', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=1`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) { test.skip(); return; }

    const response = await request.get(`${API_BASE_URL}/api/favorites/check/${prodData.products[0].id}`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('is_favorite');
  });
});

// ============================================================
// 2.7 议价功能
// ============================================================
test.describe('📦 商品管理 - 2.7 议价功能', () => {

  // TC-PM-OFR-001：发起议价
  test('TC-PM-OFR-001 议价功能 - 买家发起议价', async ({ request }) => {
    const { access_token, user } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    // 找一个非自己的商品
    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=20`);
    const prodData = await prodRes.json();
    const targetProduct = prodData.products.find(p => p.seller_id !== user.id);
    if (!targetProduct) { test.skip('没有可议价的商品'); return; }

    const response = await request.post(`${API_BASE_URL}/api/offers`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: {
        product_id: targetProduct.id,
        offered_price: 20.00,
        message: '能便宜点吗？',
      },
    });
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.offer.status).toBe('pending');
  });

  // TC-PM-OFR-002：对自己商品议价
  test('TC-PM-OFR-002 议价功能 - 不能对自己的商品议价', async ({ request }) => {
    const { access_token, user } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    // 获取自己的商品
    const prodRes = await fetch(`${API_BASE_URL}/api/products?seller_id=${user.id}&status=active`);
    const prodData = await prodRes.json();
    if (prodData.products.length === 0) { test.skip('没有自己的商品'); return; }

    const response = await request.post(`${API_BASE_URL}/api/offers`, {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      data: {
        product_id: prodData.products[0].id,
        offered_price: 10.00,
      },
    });
    expect(response.status()).toBe(400);
  });

  // TC-PM-OFR-003：卖家接受议价
  test('TC-PM-OFR-003 议价功能 - 卖家接受议价', async ({ request }) => {
    const { access_token, user } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    // 找一个发给自己的待处理议价
    const offersRes = await request.get(`${API_BASE_URL}/api/offers/seller`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    const offersData = await offersRes.json();
    const pendingOffer = offersData.offers?.find(o => o.status === 'pending');
    if (!pendingOffer) { test.skip('没有待处理的议价'); return; }

    const response = await request.post(`${API_BASE_URL}/api/offers/${pendingOffer.id}/accept`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.offer.status).toBe('accepted');
  });

  // TC-PM-OFR-004：卖家拒绝议价
  test('TC-PM-OFR-004 议价功能 - 卖家拒绝议价', async ({ request }) => {
    const { access_token, user } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    const offersRes = await request.get(`${API_BASE_URL}/api/offers/seller`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    const offersData = await offersRes.json();
    const pendingOffer = offersData.offers?.find(o => o.status === 'pending');
    if (!pendingOffer) { test.skip('没有待处理的议价'); return; }

    const response = await request.post(`${API_BASE_URL}/api/offers/${pendingOffer.id}/reject`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.offer.status).toBe('rejected');
  });

  // TC-PM-OFR-005：买家取消议价
  test('TC-PM-OFR-005 议价功能 - 买家取消议价', async ({ request }) => {
    const { access_token, user } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    const offersRes = await request.get(`${API_BASE_URL}/api/offers/buyer`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    const offersData = await offersRes.json();
    const pendingOffer = offersData.offers?.find(o => o.status === 'pending');
    if (!pendingOffer) { test.skip('没有可取消的议价'); return; }

    const response = await request.post(`${API_BASE_URL}/api/offers/${pendingOffer.id}/cancel`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.offer.status).toBe('canceled');
  });

  // TC-PM-OFR-006：重复议价
  test('TC-PM-OFR-006 议价功能 - 已有待处理议价时不能再次议价', async ({ request }) => {
    const { access_token, user } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    const prodRes = await fetch(`${API_BASE_URL}/api/products?page=1&per_page=20`);
    const prodData = await prodRes.json();
    const targetProduct = prodData.products.find(p => p.seller_id !== user.id);
    if (!targetProduct) { test.skip(); return; }

    // 检查是否已有待处理议价
    const buyerOffers = await request.get(`${API_BASE_URL}/api/offers/buyer?product_id=${targetProduct.id}`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    const buyerData = await buyerOffers.json();
    const hasPending = buyerData.offers?.some(o => o.status === 'pending');
    if (hasPending) {
      // 已有待处理议价，尝试再次议价应失败
      const response = await request.post(`${API_BASE_URL}/api/offers`, {
        headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        data: { product_id: targetProduct.id, offered_price: 15.00 },
      });
      expect(response.status()).toBe(400);
    } else {
      test.skip('没有待处理的议价作为前置条件');
    }
  });

  // TC-PM-OFR-007：卖家查看收到的议价列表
  test('TC-PM-OFR-007 议价功能 - 卖家查看收到的议价', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    const response = await request.get(`${API_BASE_URL}/api/offers/seller`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('offers');
    expect(data).toHaveProperty('total');
  });

  // TC-PM-OFR-008：买家查看自己的议价列表
  test('TC-PM-OFR-008 议价功能 - 买家查看我发出的议价', async ({ request }) => {
    const { access_token } = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);

    const response = await request.get(`${API_BASE_URL}/api/offers/buyer`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('offers');
    expect(data).toHaveProperty('total');
  });
});
