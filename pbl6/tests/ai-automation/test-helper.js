/**
 * AI 自动化测试辅助工具
 * 提供通用的测试数据、页面操作封装和断言辅助
 */

const API_BASE_URL = 'http://127.0.0.1:5000';

// ============================================================
// 测试数据生成
// ============================================================

/**
 * 生成唯一的时间戳后缀，避免测试数据冲突
 */
export function timestamp() {
  return Date.now().toString(36).slice(-6);
}

/**
 * 生成测试用户数据
 */
export function generateTestUser() {
  const ts = timestamp();
  return {
    email: `test_${ts}@example.com`,
    password: 'TestPass123',
    nickname: `测试用户_${ts}`,
  };
}

/**
 * 生成测试商品数据
 */
export function generateTestProduct() {
  const ts = timestamp();
  return {
    title: `测试二手教材_${ts}`,
    description: '这是一本九成新的教材，适合计算机专业学生使用，没有任何涂写痕迹。',
    price: '25.00',
    category: '书籍教材',
  };
}

/**
 * 生成测试聊天消息
 */
export function generateTestMessage() {
  return {
    content: `您好，我对这个商品感兴趣，请问还在吗？${Date.now()}`,
  };
}

// ============================================================
// 页面操作封装
// ============================================================

/**
 * 等待页面加载完成（网络空闲状态）
 */
export async function waitForPageReady(page) {
  await page.waitForLoadState('networkidle');
  // 额外等待确保 Vue 渲染完成
  await page.waitForTimeout(1000);
}

/**
 * 通过 API 直接创建测试用户（绕过 UI，用于准备测试数据）
 * 返回用户数据，或在已存在时返回 null
 */
export async function createTestUserViaAPI(userData) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok && data.error !== '邮箱已被注册') {
    throw new Error(`创建用户失败: ${data.error}`);
  }
  return response.ok ? data : null;
}

/**
 * 通过 API 登录获取 token（绕过 UI，用于准备测试数据）
 */
export async function loginViaAPI(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`登录失败: ${data.error}`);
  }
  return data;
}

/**
 * 检查元素是否存在（不抛出错误）
 */
export async function elementExists(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// 测试账号（预先存在的测试账号，避免重复注册）
// ============================================================

export const PRESET_TEST_USER = {
  email: 'playwright_test@example.com',
  password: 'TestPass123',
  nickname: 'Playwright测试',
};

export const PRESET_TEST_USER_2 = {
  email: 'playwright_test2@example.com',
  password: 'TestPass123',
  nickname: 'Playwright测试2',
};
