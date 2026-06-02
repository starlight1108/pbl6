/**
 * 测试环境初始化
 * 在运行测试前创建预设测试账号
 *
 * 使用方式：
 *   node tests/ai-automation/setup.js
 */

import {
  PRESET_TEST_USER,
  PRESET_TEST_USER_2,
} from './test-helper.js';

const API_BASE_URL = 'http://127.0.0.1:5000';

async function ensureUserExists(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ 用户 ${userData.email} 创建成功`);
      return data;
    } else if (data.error === '邮箱已被注册') {
      console.log(`ℹ️ 用户 ${userData.email} 已存在，跳过创建`);
      return null;
    } else {
      console.error(`❌ 创建用户 ${userData.email} 失败:`, data.error);
      return null;
    }
  } catch (error) {
    console.error(`❌ 无法连接到服务器:`, error.message);
    return null;
  }
}

async function setup() {
  console.log('========================================');
  console.log('  测试环境初始化');
  console.log('========================================');
  console.log('正在确保测试账号存在...\n');

  await ensureUserExists(PRESET_TEST_USER);
  await ensureUserExists(PRESET_TEST_USER_2);

  console.log('\n========================================');
  console.log('  初始化完成！可以运行测试了');
  console.log('  运行: npm run test:e2e');
  console.log('========================================');
}

setup();
