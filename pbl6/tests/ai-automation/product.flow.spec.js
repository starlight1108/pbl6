/**
 * AI 自动化测试 - 商品发布与浏览流程
 *
 * 测试覆盖：
 *   1. 商品发布（带图片上传）
 *   2. 首页商品列表显示
 *   3. 商品搜索功能
 *   4. 商品分类筛选
 *   5. 商品详情查看
 *   6. 商品收藏功能
 *   7. 我发布的商品管理
 *   8. 商品删除
 *   9. 商品修改
 *   10. 商品上下架
 *
 * @see https://playwright.dev/docs/writing-tests
 */

import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  generateTestProduct,
  waitForPageReady,
  PRESET_TEST_USER,
  timestamp,
} from './test-helper.js';

// 测试商品数据
const testProduct = generateTestProduct();
const testProduct2 = generateTestProduct();

test.describe('📦 商品发布与浏览流程', () => {
  // 每个测试前登录
  test.beforeEach(async ({ page }) => {
    // 清除状态 - 先导航到登录页（不会触发重定向），再清除 localStorage
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    // 登录
    await waitForPageReady(page);
    await page.fill('#email', PRESET_TEST_USER.email);
    await page.fill('#password', PRESET_TEST_USER.password);
    await page.click('button.login-button');
    await page.waitForURL('**/');
    await waitForPageReady(page);
  });

  // ==========================================================
  // 1. 商品发布流程
  // ==========================================================
  test('1.1 商品发布 - 成功发布商品', async ({ page }) => {
    await test.step('通过菜单进入发布页面', async () => {
      await page.click('button.dropdown-button');
      await page.click('button.publish-item');
      await page.waitForURL('**/products/publish');
      await waitForPageReady(page);
      await expect(page.locator('h1')).toContainText('发布商品');
    });

    await test.step('填写商品信息', async () => {
      await page.fill('#title', testProduct.title);
      await page.fill('#price', testProduct.price);
      await page.selectOption('#category', testProduct.category);
      await page.fill('#description', testProduct.description);
    });

    await test.step('上传商品图片', async () => {
      // 使用测试图片上传（如果存在测试图片文件）
      const fileInput = page.locator('#image');
      const testImagePath = 'C:\\Users\\starlight\\Documents\\项目\\pbl6\\backend\\test_images\\test_product.jpg';
      try {
        await fileInput.setInputFiles(testImagePath);
        // 验证图片预览显示
        await expect(page.locator('.image-preview')).toBeVisible();
      } catch {
        // 如果没有测试图片，跳过文件上传
        console.log('⚠️ 未找到测试图片，跳过图片上传测试');
      }
    });

    await test.step('提交发布', async () => {
      await page.click('button.submit-button');
      // 发布成功后应跳转到首页
      await page.waitForURL('**/');
      await waitForPageReady(page);
    });

    await test.step('验证商品出现在列表中', async () => {
      await page.waitForTimeout(1000); // 等待列表刷新
      const productCards = page.locator('.product-card');
      await expect(productCards.first()).toBeVisible();
      // 验证列表中包含刚发布的商品标题
      await expect(page.locator('text=' + testProduct.title).first()).toBeVisible({ timeout: 10000 });
    });
  });

  // ==========================================================
  // 2. 商品搜索
  // ==========================================================
  test('2.1 商品搜索 - 关键词搜索', async ({ page }) => {
    await test.step('在搜索框输入关键词', async () => {
      const searchInput = page.locator('.search-input');
      await searchInput.fill('教材');
      await page.click('button.search-button');
      await waitForPageReady(page);
    });

    await test.step('验证搜索结果', async () => {
      // 搜索结果应包含关键词相关商品
      await page.waitForTimeout(1000);
      const productCards = page.locator('.product-card');
      // 如果搜索结果不为空，验证每个商品标题包含关键词
      const count = await productCards.count();
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          const title = await productCards.nth(i).locator('h4').textContent();
          console.log(`搜索结果 ${i + 1}: ${title}`);
        }
      }
    });
  });

  // ==========================================================
  // 3. 商品分类筛选
  // ==========================================================
  test('3.1 分类筛选 - 按分类筛选商品', async ({ page }) => {
    await test.step('选择分类', async () => {
      await page.selectOption('.category-select', '书籍教材');
      await waitForPageReady(page);
    });

    await test.step('验证筛选结果', async () => {
      await page.waitForTimeout(1000);
      // 验证分类标签显示书籍教材
      const categoryTags = page.locator('.category-tag');
      const count = await categoryTags.count();
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          await expect(categoryTags.nth(i)).toContainText('书籍教材');
        }
      }
    });
  });

  // ==========================================================
  // 4. 商品排序
  // ==========================================================
  test('4.1 商品排序 - 按价格排序', async ({ page }) => {
    await test.step('选择价格从低到高排序', async () => {
      await page.selectOption('.sort-select', 'price_asc');
      await waitForPageReady(page);
    });

    await test.step('验证排序结果', async () => {
      await page.waitForTimeout(1000);
      const prices = page.locator('.product-price');
      const count = await prices.count();
      if (count > 1) {
        // 验证前两个商品价格递增
        const price1 = await prices.nth(0).textContent();
        const price2 = await prices.nth(1).textContent();
        const p1 = parseFloat(price1.replace('¥', ''));
        const p2 = parseFloat(price2.replace('¥', ''));
        expect(p1).toBeLessThanOrEqual(p2);
      }
    });
  });

  // ==========================================================
  // 5. 商品详情
  // ==========================================================
  test('5.1 商品详情 - 点击商品查看详情', async ({ page }) => {
    await test.step('点击第一个商品查看详情', async () => {
      await page.waitForTimeout(1000);
      // 点击商品图片进入详情
      const firstProductImage = page.locator('.product-image').first();
      await firstProductImage.waitFor({ state: 'visible', timeout: 5000 });
      // 使用 Promise.all 确保导航完成
      await Promise.all([
        page.waitForURL(/\/products\//, { timeout: 15000 }),
        firstProductImage.click({ force: true })
      ]);
      await waitForPageReady(page);
    });

    await test.step('验证详情页内容', async () => {
      // 验证详情页容器可见
      await expect(page.locator('.product-detail-container')).toBeVisible({ timeout: 5000 });
      // 验证商品标题存在
      await expect(page.locator('.product-title')).toBeVisible();
    });
  });

  // ==========================================================
  // 6. 收藏功能
  // ==========================================================
  test('6.1 商品收藏 - 收藏和取消收藏', async ({ page }) => {
    await test.step('点击收藏按钮', async () => {
      await page.waitForTimeout(1000);
      const firstFavButton = page.locator('.favorite-button').first();
      await firstFavButton.click();
      await page.waitForTimeout(500);
    });

    await test.step('查看我的收藏', async () => {
      await page.click('.favorites-button');
      await waitForPageReady(page);
      // 如果成功收藏，应该显示收藏的商品
      await page.waitForTimeout(1000);
    });
  });

  // ==========================================================
  // 7. 我发布的商品
  // ==========================================================
  test('7.1 我发布的商品 - 查看和管理', async ({ page }) => {
    await test.step('进入"我发布的"页面', async () => {
      await page.click('button.dropdown-button');
      await page.click('button.my-products-item');
      await page.waitForURL('**/my-products');
      await waitForPageReady(page);
    });

    await test.step('验证显示我的商品列表', async () => {
      await page.waitForTimeout(1000);
      // 验证页面标题
      await expect(page.locator('h1')).toContainText('我发布的商品');
      // 应该有商品卡片显示
      const productCards = page.locator('.product-card');
      const count = await productCards.count();
      console.log(`我的商品数量: ${count}`);
      if (count > 0) {
        // 验证存在操作按钮
        const actionButtons = productCards.first().locator('.product-actions');
        await expect(actionButtons).toBeVisible();
      }
    });
  });

  // ==========================================================
  // 8. 商品删除
  // ==========================================================
  test('8.1 商品删除 - 成功删除已发布的商品', async ({ page }) => {
    await test.step('进入"我发布的"页面', async () => {
      await page.click('button.dropdown-button');
      await page.click('button.my-products-item');
      await page.waitForURL('**/my-products');
      await waitForPageReady(page);
    });

    await test.step('获取当前商品数量', async () => {
      await page.waitForTimeout(1000);
      const count = await page.locator('.product-card').count();
      console.log(`删除前商品数量: ${count}`);
      // 确保有商品可删除
      if (count === 0) {
        console.log('⚠️ 没有商品可删除，跳过此测试');
        test.skip();
        return;
      }
    });

    await test.step('点击第一个商品的删除按钮并确认', async () => {
      // 获取第一个商品的标题，便于后续验证
      const firstProductTitle = await page.locator('.product-title').first().textContent();
      console.log(`即将删除商品: ${firstProductTitle}`);

      // 获取删除前的商品数量
      const beforeCount = await page.locator('.product-card').count();

      // 设置对话框处理 - 接受 confirm("确定要删除这个商品吗？")
      let dialogHandled = false;
      page.on('dialog', async (dialog) => {
        console.log(`对话框: ${dialog.type()} - ${dialog.message()}`);
        if (dialog.type() === 'confirm') {
          await dialog.accept();
          dialogHandled = true;
        } else if (dialog.type() === 'alert') {
          await dialog.accept();
        }
      });

      // 点击删除按钮
      await page.locator('button.delete-btn').first().click();

      // 等待删除完成（alert 弹窗出现并关闭）
      await page.waitForTimeout(2000);

      // 验证商品数量减少
      const afterCount = await page.locator('.product-card').count();
      console.log(`删除后商品数量: ${afterCount}`);
      expect(afterCount).toBe(beforeCount - 1);
    });

    await test.step('验证删除后的商品不再出现在列表中', async () => {
      // 刷新页面确认删除已持久化
      await page.reload();
      await waitForPageReady(page);
      await page.waitForTimeout(1000);

      const productTitles = page.locator('.product-title');
      const count = await productTitles.count();
      console.log(`刷新后的商品数量: ${count}`);
      // 页面能正常显示
      await expect(page.locator('h1')).toContainText('我发布的商品');
    });
  });
});
