import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置文件 - 校园二手交易平台 AI 自动化测试
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试文件目录
  testDir: './ai-automation',

  // 测试匹配模式
  testMatch: ['**/*.flow.spec.js', '**/*.spec.js'],

  // 失败重试次数
  retries: 1,

  // 并行测试 worker 数
  workers: 1,

  // 单次测试超时时间 (60s)
  timeout: 60000,

  // 断言超时时间
  expect: {
    timeout: 10000,
  },

  // 输出目录
  outputDir: './test-results',

  // 全局配置
  use: {
    // 应用基础 URL
    baseURL: 'http://localhost:5173',

    // 后端 API 地址
    apiBaseURL: 'http://127.0.0.1:5000',

    // 视口大小
    viewport: { width: 1280, height: 720 },

    // 操作超时
    actionTimeout: 15000,

    // 导航超时
    navigationTimeout: 30000,

    // 失败时截图
    screenshot: 'only-on-failure',

    // 保留追踪信息便于调试
    trace: 'retain-on-failure',

    // 自动等待元素可见
    autoWait: true,
  },

  // 浏览器项目
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 启动参数
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'],
        },
      },
    },
    // 需要 Firefox 和 WebKit 测试时可以取消注释
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // WebServer 配置 - 自动启动前后端
  // webServer: [
  //   {
  //     command: 'cd ..\\backend && python run.py',
  //     port: 5000,
  //     reuseExistingServer: true,
  //     timeout: 30000,
  //   },
  //   {
  //     command: 'npm run dev',
  //     port: 5173,
  //     reuseExistingServer: true,
  //     timeout: 30000,
  //   },
  // ],

  // 报告器
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
});
