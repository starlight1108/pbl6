# AI 自动化测试 - 校园二手交易平台

基于 Playwright 的端到端自动化测试套件。

## 📋 前置条件

1. **启动后端服务**（终端 1）:
   ```bash
   cd backend
   python run.py
   ```

2. **启动前端服务**（终端 2）:
   ```bash
   cd pbl6
   npm run dev
   ```

## 🚀 快速开始

### 1. 初始化测试账号

```bash
npm run test:e2e:setup
```

### 2. 运行全部测试

```bash
npm run test:e2e
```

### 3. 运行特定流程测试

```bash
# 仅运行认证流程测试
npm run test:e2e:auth

# 仅运行商品流程测试
npm run test:e2e:product

# 仅运行聊天流程测试
npm run test:e2e:chat
```

## 🧪 测试用例

| 测试文件 | 流程 | 覆盖场景 |
|---------|------|---------|
| `01-auth.flow.spec.js` | 🔐 用户管理 | 注册(7)、登录(6)、个人信息(6) — 共19个测试用例 |
| `02-product.flow.spec.js` | 📦 商品管理 | 发布(7)、浏览/搜索(5)、详情(2)、管理(5)、评论(6)、收藏(5)、议价(8) — 共38个测试用例 |
| `03-communication.flow.spec.js` | 💬 交易沟通 | 站内消息REST(8)、WebSocket(5)、通知(6+1UI)、举报(7) — 共27个测试用例 |
| `04-order.flow.spec.js` | 📋 交易管理 | 订单(10)、已售商品(2+1UI)、安全补充(4) — 共17个测试用例 |

## 🛠️ 调试模式

```bash
# 使用 Playwright UI 模式（可视化调试）
npm run test:e2e:ui

# 使用 Playwright Debug 模式
npm run test:e2e:debug

# 查看 HTML 测试报告
npm run test:e2e:report
```

## 📁 目录结构

```
tests/
├── playwright.config.js         # Playwright 配置文件
├── ai-automation/
│   ├── README.md                # 本文件
│   ├── test-helper.js           # 测试辅助工具（生成数据、API操作）
│   ├── setup.js                 # 测试环境初始化脚本
│   ├── 01-auth.flow.spec.js     # 🔐 用户管理模块（注册/登录/个人信息）
│   ├── 02-product.flow.spec.js  # 📦 商品管理模块（发布/浏览/评论/收藏/议价）
│   ├── 03-communication.flow.spec.js  # 💬 交易沟通模块（消息/WebSocket/通知/举报）
│   └── 04-order.flow.spec.js    # 📋 交易管理模块（订单/已售商品/安全验证）
├── test-results/               # 测试结果（自动生成）
└── playwright-report/          # 测试报告（自动生成）
```

## 🔄 CI/CD 集成

在 GitHub Actions 中配置：

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/setup-python@v5
      - run: pip install -r backend/requirements.txt
      - run: cd pbl6 && npm ci
      - run: npx playwright install --with-deps
      - run: python backend/run.py &  # 启动后端
      - run: cd pbl6 && npm run dev &  # 启动前端
      - run: npm run test:e2e:setup    # 初始化测试账号
      - run: npm run test:e2e          # 运行测试
```

## 💡 AI 辅助功能

Playwright 支持 AI 级别的元素定位能力：

- **语义定位**: `page.getByRole('button', { name: '登录' })`
- **文本定位**: `page.getByText('二手校园交易平台')`
- **标签定位**: `page.getByLabel('邮箱')`
- **占位符定位**: `page.getByPlaceholder('请输入邮箱')`
- **标题定位**: `page.getByTitle('商品标题')`

结合 LLM，可以进一步实现智能测试：
- 自动生成测试用例
- 智能等待和重试
- 自动修复失败的选择器
- 自然语言驱动的测试编写
