# 项目指南 - 校园二手交易网站 (PBL6)

## 技术栈

- **前端**: Vue 3 (Composition API + `<script setup>`) + Vite + Pinia + Vue Router + Tailwind CSS
- **后端**: Flask + Flask-SQLAlchemy + Flask-JWT-Extended + Flask-SocketIO
- **数据库**: SQLite
- **测试**: Playwright (E2E) + pytest (后端单元测试)

## 项目结构

```
backend/                      # Flask 后端
  run.py                      # 启动入口: socketio.run(app, host='127.0.0.1', port=5000)
  app/
    __init__.py               # create_app() 工厂函数, 注册 db/jwt/cors/socketio
    config.py                 # 配置类 (DevelopmentConfig/ProductionConfig/TestingConfig)
    models/                   # SQLAlchemy 模型
    routes/                   # API 路由 (Blueprint)
      auth.py                 # 认证相关 (/api/auth/*)
      user.py                 # 用户相关 (/api/user/*)
      product.py              # 商品相关 (/api/product/*)
      order.py                # 订单相关 (/api/order/*)
      chat.py                 # 聊天相关 (SocketIO + /api/chat/*)
      notification.py         # 通知相关 (/api/notification/*)
      report.py               # 举报相关 (/api/report/*)
      admin.py                # 管理后台 (/api/admin/*)
    utils.py                  # 工具函数
    static/                   # 静态资源
pbl6/                         # Vue 3 前端
  src/
    main.js                   # 入口: createApp + Pinia + Router
    App.vue                   # 根组件, 路由视图
    index.css                 # Tailwind + 全局样式
    components/               # 通用组件
    views/                    # 页面组件
    router/                   # Vue Router 配置
    stores/                   # Pinia 状态管理
  tests/                      # Playwright E2E 测试
docs/                         # 项目文档
```

## 开发命令

### 前端 (pbl6/)
```bash
npm run dev          # 启动 Vite 开发服务器 (默认 :5173)
npm run build        # 生产构建
npm run test:e2e     # 运行 Playwright E2E 测试
```

### 后端 (backend/)
```bash
python run.py        # 启动 Flask 开发服务器 (:5000)
pytest               # 运行后端单元测试
python run_tests.py  # 运行测试并生成覆盖率报告
```

## 前端规范

- 使用 **Vue 3 Composition API** + `<script setup>` 语法
- 状态管理使用 **Pinia** (位于 `src/stores/`)
- 路由配置在 `src/router/` 中
- 通用组件放在 `src/components/`，页面组件放在 `src/views/`
- 使用 **Tailwind CSS** 进行样式开发
- API 请求通过 Pinia store 中的 action 发起，使用 `fetch` 或封装工具
- 所有 API 路径以 `/api/` 开头

## 后端规范

- Flask 应用使用 **工厂模式** (`create_app()`)
- 路由使用 **Blueprint** 组织，注册在 `api_bp` 下，统一 `/api` 前缀
- 数据库模型定义在 `app/models/`，使用 Flask-SQLAlchemy
- 认证使用 JWT (Flask-JWT-Extended)
- WebSocket 实时通信使用 Flask-SocketIO (namespace: `/chat`)
- 配置文件在 `app/config.py`，通过环境变量 `FLASK_ENV` 选择配置

## API 约定

- 成功响应: `{ "msg": "...", "data": {...} }` 
- 错误响应: `{ "msg": "错误信息" }` (配合适当 HTTP 状态码)
- 认证: 在请求头中携带 `Authorization: Bearer <token>`
- 分页: 查询参数 `page` 和 `per_page`

## 测试规范

- 后端测试使用 pytest，测试文件在 `tests/` 目录下
- E2E 测试使用 Playwright，测试文件在 `pbl6/tests/ai-automation/` 目录下
- 后端测试可使用 `conftest.py` 中的 fixture 创建测试客户端和数据库
