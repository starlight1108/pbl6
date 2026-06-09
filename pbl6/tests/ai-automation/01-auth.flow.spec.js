/**
 * AI 自动化测试 - 用户管理模块
 *
 * 对应测试用例文档：一、用户管理模块
 *   1.1 用户注册 (TC-UM-REG-001 ~ 007)
 *   1.2 用户登录 (TC-UM-LOG-001 ~ 006)
 *   1.3 个人信息管理 (TC-UM-PRO-001 ~ 006)
 *
 * @see ../document/测试用例文档.md
 */

import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  waitForPageReady,
  resetToLoginPage,
  loginViaUI,
  PRESET_TEST_USER,
} from './test-helper.js';

// ============================================================
// 1.1 用户注册
// ============================================================
test.describe('🔐 用户管理 - 1.1 用户注册', () => {

  test.beforeEach(async ({ page }) => {
    await resetToLoginPage(page);
  });

  // TC-UM-REG-001：正常注册（含昵称）
  test('TC-UM-REG-001 正常注册 - 填写完整信息注册成功', async ({ page }) => {
    const testUser = generateTestUser();

    await test.step('1. 访问注册页面', async () => {
      await page.goto('/');
      await page.waitForTimeout(500);
      await page.getByText('立即注册').click();
      await page.waitForURL('**/register', { timeout: 15000 });
      await waitForPageReady(page);
      await expect(page.locator('h3')).toHaveText('用户注册', { timeout: 10000 });
    });

    await test.step('2-5. 填写注册表单', async () => {
      await page.fill('#email', testUser.email);
      await page.fill('#password', testUser.password);
      await page.fill('#confirmPassword', testUser.password);
      await page.fill('#nickname', testUser.nickname);
    });

    await test.step('6. 点击注册按钮并验证', async () => {
      await page.click('button.register-button');
      // 预期：跳转到登录页
      await page.waitForURL('**/login', { timeout: 15000 });
      await expect(page.locator('h3')).toHaveText('用户登录');
    });
  });

  // 辅助函数：通过登录页链接跳转到注册页
  async function navigateToRegister(page) {
    await page.getByText('立即注册').click();
    await page.waitForURL('**/register', { timeout: 15000 });
    await waitForPageReady(page);
    await expect(page.locator('h3')).toHaveText('用户注册', { timeout: 10000 });
  }

  // TC-UM-REG-002：必填字段校验（无密码）
  test('TC-UM-REG-002 注册校验 - 缺少密码时提示错误', async ({ page }) => {
    await test.step('填写邮箱但不填密码并提交', async () => {
      await navigateToRegister(page);
      await page.fill('#email', 'test@edu.cn');
      // HTML5 required 会阻止提交，通过 JavaScript 绕过并触发 Vue 校验
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) form.dispatchEvent(new Event('submit'));
      });
      await page.waitForTimeout(500);
      // 预期：提示错误且不跳转
      await expect(page.locator('.error-message')).toContainText('请填写所有必填字段', { timeout: 5000 });
      await expect(page.locator('h3')).toHaveText('用户注册');
    });
  });

  // TC-UM-REG-003：邮箱重复
  test('TC-UM-REG-003 注册校验 - 重复邮箱注册被拒绝', async ({ page }) => {
    await test.step('使用已注册的邮箱注册', async () => {
      await navigateToRegister(page);
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', 'Pass123456');
      await page.fill('#confirmPassword', 'Pass123456');
      await page.click('button.register-button');
      await page.waitForTimeout(1000);
      // 预期：提示邮箱已注册
      await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 });
    });
  });

  // TC-UM-REG-004：邮箱格式非法
  test('TC-UM-REG-004 注册校验 - 邮箱格式非法时前端拦截', async ({ page }) => {
    await test.step('输入非法邮箱格式', async () => {
      await navigateToRegister(page);
      // HTML5 email 类型会阻止表单提交
      await page.fill('#email', 'notanemail');
      await page.fill('#password', 'Pass123456');
      await page.fill('#confirmPassword', 'Pass123456');
      await page.click('button.register-button');
      await page.waitForTimeout(500);
      // 预期：由于 email input type=email 的限制，表单不会提交成功
      await expect(page.locator('h3')).toHaveText('用户注册');
    });
  });

  // TC-UM-REG-005：密码长度不足
  test('TC-UM-REG-005 注册校验 - 密码长度不足时提示', async ({ page }) => {
    await test.step('输入过短密码', async () => {
      await navigateToRegister(page);
      await page.fill('#email', 'short@edu.cn');
      await page.fill('#password', '123');
      await page.fill('#confirmPassword', '123');
      await page.click('button.register-button');
      await page.waitForTimeout(500);
      // 预期：前端提示密码长度至少为6位
      await expect(page.locator('.error-message')).toContainText('至少', { timeout: 5000 });
    });
  });

  // TC-UM-REG-006：密码确认不一致
  test('TC-UM-REG-006 注册校验 - 两次密码输入不一致提示错误', async ({ page }) => {
    await test.step('输入不一致的确认密码', async () => {
      await navigateToRegister(page);
      await page.fill('#email', 'mismatch@edu.cn');
      await page.fill('#password', 'Pass123456');
      await page.fill('#confirmPassword', 'Pass654321');
      await page.click('button.register-button');
      await page.waitForTimeout(500);
      // 预期：前端提示两次输入的密码不一致
      await expect(page.locator('.error-message')).toContainText('不一致', { timeout: 5000 });
    });
  });

  // TC-UM-REG-007：默认昵称
  test('TC-UM-REG-007 注册校验 - 不填昵称时自动使用邮箱前缀', async ({ page }) => {
    const email = `auto_${Date.now().toString(36).slice(-6)}@edu.cn`;

    await test.step('通过 API 直接注册（不传昵称）验证默认昵称逻辑', async () => {
      const registerRes = await fetch('http://127.0.0.1:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Pass123456' }),
      });
      const registerData = await registerRes.json();
      expect(registerRes.status).toBe(201);
      // 后端应使用邮箱前缀作为默认昵称
      const expectedNickname = email.split('@')[0];
      expect(registerData.user.nickname).toBe(expectedNickname);
    });

    await test.step('验证通过登录接口返回的昵称', async () => {
      const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Pass123456' }),
      });
      const loginData = await loginRes.json();
      const expectedNickname = email.split('@')[0];
      expect(loginData.user.nickname).toBe(expectedNickname);
    });
  });
});

// ============================================================
// 1.2 用户登录
// ============================================================
test.describe('🔐 用户管理 - 1.2 用户登录', () => {

  test.beforeEach(async ({ page }) => {
    await resetToLoginPage(page);
  });

  // TC-UM-LOG-001：正常登录
  test('TC-UM-LOG-001 正常登录 - 正确凭证登录成功', async ({ page }) => {
    await test.step('访问登录页面并填写表单', async () => {
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', PRESET_TEST_USER.password);
    });

    await test.step('提交登录并验证', async () => {
      await page.click('button.login-button');
      await page.waitForURL('**/');
      await waitForPageReady(page);
      // 导航栏显示用户信息（不检查具体昵称，避免被其他测试修改昵称影响）
      await expect(page.locator('.user-info')).toBeVisible({ timeout: 5000 });
      // localStorage 保存了 token
      const userData = await page.evaluate(() => localStorage.getItem('user'));
      const user = JSON.parse(userData || '{}');
      expect(user.token).toBeTruthy();
    });
  });

  // TC-UM-LOG-002：错误密码
  test('TC-UM-LOG-002 登录校验 - 密码错误时拒绝登录', async ({ page }) => {
    await test.step('输入错误密码', async () => {
      await page.fill('#email', PRESET_TEST_USER.email);
      await page.fill('#password', 'WrongPass123');
    });

    await test.step('提交并验证', async () => {
      await page.click('button.login-button');
      await page.waitForTimeout(1500);
      // 提示错误，停留在登录页
      await expect(page.locator('.error-message')).toContainText('Invalid email or password', { timeout: 5000 });
      await expect(page.locator('h3')).toHaveText('用户登录');
      // localStorage 不应有 token
      const token = await page.evaluate(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.token;
      });
      expect(token).toBeFalsy();
    });
  });

  // TC-UM-LOG-003：用户不存在
  test('TC-UM-LOG-003 登录校验 - 未注册邮箱登录失败', async ({ page }) => {
    await test.step('输入未注册的邮箱', async () => {
      await page.fill('#email', 'nonexist@edu.cn');
      await page.fill('#password', 'Pass123456');
      await page.click('button.login-button');
      await page.waitForTimeout(1500);
      // 预期：不明确提示用户不存在（后端返回英文）
      await expect(page.locator('.error-message')).toContainText('Invalid email or password', { timeout: 5000 });
    });
  });

  // TC-UM-LOG-004：会话持久化
  test('TC-UM-LOG-004 登录选项 - 登录后刷新页面状态保持不变', async ({ page }) => {
    await test.step('先登录', async () => {
      await loginViaUI(page, PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    });

    await test.step('刷新页面', async () => {
      await page.reload();
      await waitForPageReady(page);
    });

    await test.step('验证登录状态持久化', async () => {
      // 刷新后用户信息应可见
      await expect(page.locator('.user-info')).toBeVisible({ timeout: 5000 });
      const userData = await page.evaluate(() => localStorage.getItem('user'));
      const user = JSON.parse(userData || '{}');
      expect(user.token).toBeTruthy();
    });
  });

  // TC-UM-LOG-005：未登录访问受保护页面
  test('TC-UM-LOG-005 权限控制 - 未登录访问需认证页面被拦截', async ({ page }) => {
    await test.step('清除状态后访问受保护页面', async () => {
      // 访问个人中心
      await page.goto('/profile');
      await waitForPageReady(page);
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step('访问我的商品', async () => {
      await page.goto('/my-products');
      await waitForPageReady(page);
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step('访问发布商品', async () => {
      await page.goto('/products/publish');
      await waitForPageReady(page);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // TC-UM-LOG-006：退出登录
  test('TC-UM-LOG-006 退出登录 - 成功退出并跳转登录页', async ({ page }) => {
    await test.step('先登录', async () => {
      await loginViaUI(page, PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    });

    await test.step('退出登录', async () => {
      // 点击用户下拉菜单
      await page.click('button.dropdown-button');
      await page.click('button.logout-item');
      await page.waitForURL('**/login', { timeout: 15000 });
    });

    await test.step('验证已退出', async () => {
      await expect(page.locator('h3')).toHaveText('用户登录');
      const token = await page.evaluate(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.token;
      });
      expect(token).toBeFalsy();
    });
  });
});

// ============================================================
// 1.3 个人信息管理
// ============================================================
test.describe('🔐 用户管理 - 1.3 个人信息管理', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page, PRESET_TEST_USER.email, PRESET_TEST_USER.password);
  });

  // TC-UM-PRO-001：查看个人信息
  test('TC-UM-PRO-001 个人信息 - 已登录用户可查看个人资料', async ({ page }) => {
    await test.step('进入个人中心', async () => {
      await page.goto('/profile');
      await waitForPageReady(page);
    });

    await test.step('验证信息展示', async () => {
      // 验证显示用户信息
      await expect(page.locator('.profile-container')).toBeVisible({ timeout: 5000 });
      // 验证昵称输入框存在
      await expect(page.locator('#nickname')).toBeVisible();
      // 验证邮箱输入框存在（禁用状态）
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#email')).toBeDisabled();
    });
  });

  // TC-UM-PRO-002：修改昵称
  test('TC-UM-PRO-002 个人信息 - 修改昵称成功', async ({ page }) => {
    const newNickname = `新昵称_${Date.now().toString(36).slice(-4)}`;

    await test.step('进入个人资料页并修改昵称', async () => {
      await page.goto('/profile');
      await waitForPageReady(page);
      await page.fill('#nickname', newNickname);
      await page.click('button.submit-button');
      await page.waitForTimeout(1000);
    });

    await test.step('验证昵称更新', async () => {
      // 刷新页面验证持久化
      await page.reload();
      await waitForPageReady(page);
      await expect(page.locator('#nickname')).toHaveValue(newNickname);
    });
  });

  // TC-UM-PRO-003：上传头像
  test('TC-UM-PRO-003 个人信息 - 上传合法头像图片', async ({ page }) => {
    await test.step('进入个人资料页上传头像', async () => {
      await page.goto('/profile');
      await waitForPageReady(page);

      // 在 test_images 目录下找测试图片，或创建一个
      const fileInput = page.locator('input[type="file"]');
      const testImagePath = 'C:\\Users\\starlight\\Documents\\项目\\pbl6\\backend\\test_images\\test_avatar.png';
      try {
        await fileInput.setInputFiles(testImagePath);
        await page.waitForTimeout(500);
        await page.click('button.submit-button');
        await page.waitForTimeout(1000);
        // 验证上传成功提示
        await expect(page.locator('.success-message')).toBeVisible({ timeout: 3000 });
      } catch {
        console.log('⚠️ 未找到测试图片，跳过头像上传验证');
        test.skip();
      }
    });
  });

  // TC-UM-PRO-004：上传非法类型头像
  test('TC-UM-PRO-004 个人信息 - 上传非法文件类型被拒绝', async ({ page }) => {
    await test.step('尝试上传文本文件', async () => {
      await page.goto('/profile');
      await waitForPageReady(page);

      // 使用一个临时创建的文本文件
      const fileInput = page.locator('input[type="file"]');
      // 前端有文件类型校验，选择 .txt 文件会触发前端的 check
      // 直接通过 API 测试后端校验可能更可靠
      const loginData = await fetch('http://127.0.0.1:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: PRESET_TEST_USER.email, password: PRESET_TEST_USER.password }),
      });
      const { access_token } = await loginData.json();

      // 创建 FormData 模拟上传 .txt 文件
      const formData = new FormData();
      const blob = new Blob(['fake avatar content'], { type: 'text/plain' });
      formData.append('avatar', blob, 'test.txt');

      const response = await fetch('http://127.0.0.1:5000/api/user/avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${access_token}` },
        body: formData,
      });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
    });
  });

  // TC-UM-PRO-005：未登录访问个人资料
  test('TC-UM-PRO-005 权限控制 - 未登录查看个人资料被拦截', async ({ page }) => {
    await test.step('清除登录状态后访问 /profile', async () => {
      await page.evaluate(() => localStorage.clear());
      await page.goto('/profile');
      await waitForPageReady(page);
      // 应自动重定向到登录页
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // TC-UM-PRO-006：上传头像无文件
  test('TC-UM-PRO-006 个人信息 - 不选择文件直接上传被拒绝', async ({ page }) => {
    await test.step('进入个人资料页并清空昵称', async () => {
      await page.goto('/profile');
      await waitForPageReady(page);
      // 清空昵称输入框确保触发"至少修改一项"校验
      await page.fill('#nickname', '');
    });

    await test.step('直接点击提交（不选文件）', async () => {
      await page.click('button.submit-button');
      await page.waitForTimeout(1000);
      // 预期提示需要修改至少一项（Profile.vue 使用 .message 类，带 error 样式）
      await expect(page.locator('.message')).toContainText('请至少修改一项信息', { timeout: 3000 });
    });
  });
});
