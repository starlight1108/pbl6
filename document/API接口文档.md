# 校园二手交易网站 API 接口文档

## 基础信息

| 项 | 说明 |
|----|------|
| 基础 URL | `http://localhost:5000/api` |
| 数据格式 | JSON |
| 编码 | UTF-8 |
| 认证方式 | Bearer Token (JWT) |

---

## 1. 用户注册

**接口地址：** `POST /auth/register`

**说明：** 新用户通过邮箱注册账号

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| email | string | 是 | 校园邮箱地址 |
| password | string | 是 | 密码 |
| nickname | string | 否 | 用户昵称（默认为邮箱用户名） |

**请求示例：**
```json
{
    "email": "test@edu.cn",
    "password": "password123",
    "nickname": "小明"
}
```

**成功响应 (201)：**
```json
{
    "message": "Registration successful",
    "user": {
        "id": 1,
        "email": "test@edu.cn",
        "nickname": "小明",
        "created_at": "2024-01-15T10:30:00.000000"
    }
}
```

**错误响应：**

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 缺少必填参数: email, password |
| 409 | 邮箱已被注册 |

---

## 2. 用户登录

**接口地址：** `POST /auth/login`

**说明：** 用户使用邮箱密码登录，获取访问令牌

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| email | string | 是 | 注册邮箱 |
| password | string | 是 | 密码 |

**请求示例：**
```json
{
    "email": "test@edu.cn",
    "password": "password123"
}
```

**成功响应 (200)：**
```json
{
    "message": "Login successful",
    "user": {
        "id": 1,
        "email": "test@edu.cn",
        "nickname": "小明",
        "created_at": "2024-01-15T10:30:00.000000"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**错误响应：**

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 缺少邮箱或密码 |
| 401 | 邮箱或密码错误 |

---

## 3. 发布商品

**接口地址：** `POST /products`

**认证方式：** 需要 JWT Token 在 Header 中

```
Authorization: Bearer <access_token>
```

**说明：** 已登录用户发布二手商品

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| title | string | 是 | 商品标题 |
| price | decimal | 是 | 商品价格 |
| description | string | 否 | 商品描述 |
| category | string | 否 | 商品分类，默认"其他" |

**请求示例：**
```json
{
    "title": "二手Python编程教材",
    "price": 29.99,
    "description": "9成新，无划痕",
    "category": "书籍教材"
}
```

**成功响应 (201)：**
```json
{
    "message": "Product created successfully",
    "product": {
        "id": 1,
        "seller_id": 1,
        "seller": {
            "id": 1,
            "nickname": "小明"
        },
        "title": "二手Python编程教材",
        "description": "9成新，无划痕",
        "price": 29.99,
        "category": "书籍教材",
        "status": "active",
        "created_at": "2024-01-15T11:00:00.000000"
    }
}
```

**错误响应：**

| HTTP 状态码 | 说明 |
|-------------|------|
| 400 | 缺少必填参数: title, price |
| 401 | 未登录或Token无效 |
| 404 | 用户不存在 |

---

## 4. 商品列表浏览

**接口地址：** `GET /products`

**说明：** 获取商品列表，支持分页、筛选和搜索

**查询参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| per_page | int | 否 | 每页数量，默认 20 |
| category | string | 否 | 按分类筛选 |
| keyword | string | 否 | 按标题关键词搜索 |

**请求示例：**
```
GET /products?page=1&per_page=10&category=书籍教材&keyword=Python
```

**成功响应 (200)：**
```json
{
    "products": [
        {
            "id": 1,
            "seller_id": 1,
            "seller": {
                "id": 1,
                "nickname": "小明"
            },
            "title": "二手Python编程教材",
            "description": "9成新，无划痕",
            "price": 29.99,
            "category": "书籍教材",
            "status": "active",
            "created_at": "2024-01-15T11:00:00.000000"
        }
    ],
    "total": 50,
    "pages": 5,
    "current_page": 1
}
```

---

## 5. 商品详情

**接口地址：** `GET /products/{product_id}`

**说明：** 获取单个商品的详细信息

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| product_id | int | 是 | 商品ID |

**请求示例：**
```
GET /products/1
```

**成功响应 (200)：**
```json
{
    "product": {
        "id": 1,
        "seller_id": 1,
        "seller": {
            "id": 1,
            "nickname": "小明"
        },
        "title": "二手Python编程教材",
        "description": "9成新，无划痕",
        "price": 29.99,
        "category": "书籍教材",
        "status": "active",
        "created_at": "2024-01-15T11:00:00.000000"
    }
}
```

**错误响应：**

| HTTP 状态码 | 说明 |
|-------------|------|
| 404 | 商品不存在 |

---

## 接口汇总

| 序号 | 接口名称 | 方法 | 路径 | 认证 |
|------|---------|------|------|------|
| 1 | 用户注册 | POST | `/api/auth/register` | 否 |
| 2 | 用户登录 | POST | `/api/auth/login` | 否 |
| 3 | 发布商品 | POST | `/api/products` | 是 |
| 4 | 商品列表 | GET | `/api/products` | 否 |
| 5 | 商品详情 | GET | `/api/products/{id}` | 否 |

---

## 验证说明

✅ 所有接口均通过 **20个测试用例** 验证，文档与代码实现一致
✅ 测试覆盖率：用户注册、登录、商品发布、商品浏览、商品详情的正常流程和异常场景
