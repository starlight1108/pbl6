/**
 * AI 自动化测试 - 用户认证流程
 *
 * 测试覆盖：
 *   1. 用户注册
 *   2. 用户登录（使用预设测试账号）
 *   3. 登录后页面状态验证
 *   4. 退出登录
 *   5. 表单验证（空字段、密码不匹配等）
 *   6. 已登录状态自动恢复（localStorage 持久化）
 *   7. 未登录自动重定向
 *
 * @see https://playwright.dev/docs/writing-tests
 */

import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  waitForPageReady,
  timestamp,
  PRESET_TEST_USER,
} from './test-helper.js';

test.describe('🔐 用户认证流程', () => {
  // 用于注册测试的动态用户
  const testUser = generateTestUser();

  test.beforeEach(async ({ page }) => {
    // 导航到登录页（不会触发重定向），然后清除 localStorage
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  // ==========================================================
  // 1. 用户注册流程
  // ==========================================================
  test('1.1 用户注册 - 成功注册新账号', async ({ page }) => {
    await test.step('访问注册页面', async () => {
      // 先用 page.goto 导航到根路径
      await page.goto('/');
      await page.waitForTimeout(500);
      // 通过页面内链接点击跳转到注册页（避免 SPA 路由初始化的重定向问题）
      await page.getByText('立即注册').click();
      await page.waitForURL('**/register', { timeout: 15000 });
      await waitForPageReady(page);
      console.log(`当前URL: ${page.url()}`);
      await expect(page.locator('h3')).toHaveText('用户注册', { timeout: 10000 });
    });

    await test.step('填写注册表单', async () => {
      await page.fill('#email', testUser.email);
      await page.fill('#nickname', testUser.nickname);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
    });

    await test.step('提交注册表单', async () => {
      await page.click('button.register-button');
      // 注册成功后应跳转到登录页
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page.locator('h3')).toHaveText('用户登录');
    });
  });

  // ==========================================================
  // 2. 登录流程（使用预设测试账号）
  // ==========================================================
  test('2.1 用户登录 - 成功登录并跳转首页', async ({ page }) => {
    await test.step('访问登录页面', async () => {
      await page.goto('/login');
      await waitForPageReady(page);
      await expect(page.locator('h3')).toHaveText('用户登录');
    });

    await test.step('填写登录表单', async () => {
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', PRESET_TEST_USER.password);
    });

    await test.step('提交登录表单', async () => {
      await page.click('button.login-button');
      // 登录成功后应跳转到首页
      await page.waitForURL('**/', { timeout: 15000 });
    });

    await test.step('验证登录后页面状态', async () => {
      await waitForPageReady(page);
      // 验证导航栏显示用户信息
      await expect(page.locator('.header')).toContainText(PRESET_TEST_USER.nickname);
      // 验证存在下拉菜单按钮（登录后可见）
      await expect(page.locator('button.dropdown-button')).toBeVisible();
    });
  });

  // ==========================================================
  // 3. 会话持久化
  // ==========================================================
  test('3.1 会话持久化 - 刷新页面后登录状态保持不变', async ({ page }) => {
    await test.step('先登录', async () => {
      await page.goto('/login');
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', PRESET_TEST_USER.password);
      await page.click('button.login-button');
      await page.waitForURL('**/', { timeout: 15000 });
      await waitForPageReady(page);
      await expect(page.locator('.header')).toContainText(PRESET_TEST_USER.nickname);
    });

    await test.step('刷新页面', async () => {
      await page.reload();
      await waitForPageReady(page);
    });

    await test.step('验证登录状态持久化', async () => {
      // 验证 token 保存在 localStorage
      const token = await page.evaluate(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.token;
      });
      expect(token).toBeTruthy();

      // 验证页面仍显示用户信息
      await expect(page.locator('.header')).toContainText(PRESET_TEST_USER.nickname);
    });
  });

  // ==========================================================
  // 4. 退出登录
  // ==========================================================
  test('4.1 退出登录 - 成功退出并跳转登录页', async ({ page }) => {
    await test.step('先登录', async () => {
      await page.goto('/login');
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', PRESET_TEST_USER.password);
      await page.click('button.login-button');
      await page.waitForURL('**/', { timeout: 15000 });
      await waitForPageReady(page);
    });

    await test.step('打开下拉菜单并点击退出', async () => {
      await page.click('button.dropdown-button');
      await page.click('button.logout-item');
    });

    await test.step('验证已退出', async () => {
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page.locator('h3')).toHaveText('用户登录');
      // localStorage 应被清空
      const token = await page.evaluate(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.token;
      });
      expect(token).toBeFalsy();
    });
  });

  // ==========================================================
  // 5. 表单验证
  // ==========================================================
  test('5.1 表单验证 - 空字段提示错误', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);
    // 直接提交空表单，验证未发生页面跳转
    await page.click('button.login-button');
    await expect(page.locator('h3')).toHaveText('用户登录');
  });

  test('5.2 表单验证 - 密码不一致提示', async ({ page }) => {
    // 通过页面内链接导航到注册页
    await page.getByText('立即注册').click();
    await page.waitForURL('**/register', { timeout: 15000 });
    await waitForPageReady(page);

    await page.fill('#email', `mismatch_${timestamp()}@example.com`);
    await page.fill('#password', 'Password123');
    await page.fill('#confirmPassword', 'DifferentPass456');
    await page.click('button.register-button');

    // 等待 Vue 渲染错误消息
    await page.waitForTimeout(1000);
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    // 注册页校验密码不一致: "两次输入的密码不一致"
    await expect(errorMsg).toContainText('不一致');
  });

  test('5.3 表单验证 - 密码长度不足', async ({ page }) => {
    // 通过页面内链接导航到注册页
    await page.getByText('立即注册').click();
    await page.waitForURL('**/register', { timeout: 15000 });
    await waitForPageReady(page);

    await page.fill('#email', `shortpwd_${timestamp()}@example.com`);
    await page.fill('#password', '12345');
    await page.fill('#confirmPassword', '12345');
    await page.click('button.register-button');

    await page.waitForTimeout(1000);
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    // 注册页校验密码长度: "密码长度至少为6位"
    await expect(errorMsg).toContainText('至少');
  });

  // ==========================================================
  // 6. 未登录重定向
  // ==========================================================
  test('6.1 未登录访问 - 自动跳转到登录页', async ({ page }) => {
    // beforeEach 已经在 /login 并清除了 localStorage
    // 从 /login 导航到 /，验证被重定向回 /login
    await page.goto('/');
    await waitForPageReady(page);
    // 未登录时应跳转到登录页
    await expect(page).toHaveURL(/\/login/);
  });
});
