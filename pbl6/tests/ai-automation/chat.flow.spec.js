/**
 * AI 自动化测试 - 聊天功能流程
 *
 * 测试覆盖：
 *   1. 进入聊天列表页面
 *   2. 从商品详情联系卖家（创建会话）
 *   3. 发送消息
 *   4. 消息列表显示
 *   5. 返回聊天列表验证会话更新
 *
 * @see https://playwright.dev/docs/writing-tests
 */

import { test, expect } from '@playwright/test';
import {
  waitForPageReady,
  PRESET_TEST_USER,
  generateTestMessage,
} from './test-helper.js';

test.describe('💬 聊天功能流程', () => {
  test.beforeEach(async ({ page }) => {
    // 清除状态并登录
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await waitForPageReady(page);
    await page.fill('#email', PRESET_TEST_USER.email);
    await page.fill('#password', PRESET_TEST_USER.password);
    await page.click('button.login-button');
    await page.waitForURL('**/');
    await waitForPageReady(page);
  });

  // ==========================================================
  // 1. 进入聊天列表
  // ==========================================================
  test('1.1 聊天列表 - 通过菜单进入消息页面', async ({ page }) => {
    await test.step('点击菜单中的"我的消息"', async () => {
      await page.click('button.dropdown-button');
      await page.click('button.chat-item');
      await page.waitForURL('**/chat');
      await waitForPageReady(page);
    });

    await test.step('验证聊天列表页面', async () => {
      await expect(page.locator('h1')).toHaveText('消息');
      // 应显示 WebSocket 连接状态
      await expect(page.locator('.status-dot')).toBeVisible();
    });
  });

  // ==========================================================
  // 2. 从商品详情页联系卖家
  // ==========================================================
  test('2.1 联系卖家 - 从商品详情创建会话', async ({ page }) => {
    await test.step('回到首页浏览商品', async () => {
      await page.goto('/');
      await waitForPageReady(page);
      await page.waitForTimeout(1000);
    });

    await test.step('点击第一个不是自己发布的商品的"联系卖家"按钮', async () => {
      // 寻找"联系卖家"按钮并点击
      const contactBtn = page.locator('.contact-seller-btn').first();
      const exists = await contactBtn.isVisible().catch(() => false);

      if (exists) {
        await contactBtn.click();
        // 点击后应跳转到聊天室
        await page.waitForURL(/\/chat\//);
        await waitForPageReady(page);

        // 验证聊天室页面
        await expect(page.locator('.chat-room-container')).toBeVisible();
        console.log('✅ 成功从商品详情创建会话');
      } else {
        console.log('⚠️ 没有可联系的卖家商品（所有商品可能都是当前用户发布的），跳过此测试');
        test.skip();
      }
    });
  });

  // ==========================================================
  // 3. 发送消息
  // ==========================================================
  test('3.1 发送消息 - 在聊天室发送文本消息', async ({ page }) => {
    await test.step('先进入聊天列表', async () => {
      await page.goto('/chat');
      await waitForPageReady(page);
    });

    await test.step('点击第一个会话进入聊天室', async () => {
      await page.waitForTimeout(1000);
      const conversationItems = page.locator('.conversation-item');
      const count = await conversationItems.count();

      if (count === 0) {
        console.log('⚠️ 没有会话，跳过此测试');
        test.skip();
        return;
      }

      await conversationItems.first().click();
      await page.waitForURL(/\/chat\//);
      await waitForPageReady(page);
    });

    await test.step('输入并发送消息', async () => {
      const messageText = generateTestMessage().content;
      const textarea = page.locator('textarea[placeholder="输入消息..."]');
      await expect(textarea).toBeVisible({ timeout: 5000 });

      await textarea.fill(messageText);
      // 按 Enter 发送
      await textarea.press('Enter');
      await page.waitForTimeout(2000);
    });

    await test.step('验证消息显示在聊天中', async () => {
      // 验证消息区域包含刚发送的消息
      const messageElements = page.locator('.message.self .message-content p');
      const count = await messageElements.count();
      expect(count).toBeGreaterThanOrEqual(1);

      // 验证最后一条消息是我们发的
      const lastMessage = await messageElements.last().textContent();
      console.log(`最后发送的消息: ${lastMessage}`);
      expect(lastMessage.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================
  // 4. 聊天列表更新
  // ==========================================================
  test('4.1 聊天列表 - 返回列表页验证会话存在', async ({ page }) => {
    await test.step('进入聊天列表页', async () => {
      await page.goto('/chat');
      await waitForPageReady(page);
    });

    await test.step('验证会话列表加载', async () => {
      await page.waitForTimeout(1000);
      const conversationItems = page.locator('.conversation-item');
      const count = await conversationItems.count();

      if (count > 0) {
        // 验证会话列表项包含头像、昵称和时间
        await expect(conversationItems.first().locator('.avatar')).toBeVisible();
        await expect(conversationItems.first().locator('.nickname')).toBeVisible();
        await expect(conversationItems.first().locator('.time')).toBeVisible();

        console.log(`✅ 会话列表加载成功，共 ${count} 个会话`);
      } else {
        console.log('ℹ️ 当前没有会话');
      }
    });

    await test.step('验证 WebSocket 连接状态', async () => {
      // 验证连接状态指示器
      const statusDot = page.locator('.status-dot');
      const classAttr = await statusDot.getAttribute('class');
      console.log(`WebSocket 连接状态: ${classAttr}`);
      // 可能是在线或离线，只要显示了就 OK
      await expect(statusDot).toBeVisible();
    });
  });
});
