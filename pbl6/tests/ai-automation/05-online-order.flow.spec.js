/**
 * AI 自动化测试 - 线上交易管理模块
 *
 * 测试线上交易（闲鱼式担保交易）的完整流程：
 *   创建订单 → 卖家确认 → 买家付款 → 卖家发货(可填快递单号) → 买家收货 → 退款流程
 *
 * @see ../document/测试用例文档.md
 */

import { test, expect } from '@playwright/test';
import {
  generateTestProduct,
  loginViaAPI,
  PRESET_TEST_USER,
  PRESET_TEST_USER_2,
} from './test-helper.js';

const API_BASE_URL = 'http://127.0.0.1:5000';

test.describe('🔒 线上交易流程 - 担保交易测试', () => {

  let buyerToken = null;
  let sellerToken = null;
  let testProductId = null;

  test.beforeAll(async ({ request }) => {
    const buyerData = await loginViaAPI(PRESET_TEST_USER.email, PRESET_TEST_USER.password);
    buyerToken = buyerData.access_token;

    const sellerData = await loginViaAPI(PRESET_TEST_USER_2.email, PRESET_TEST_USER_2.password);
    sellerToken = sellerData.access_token;

    // 卖家发布测试商品
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 100.00, category: '电子数码' },
    });
    testProductId = (await prodRes.json()).product.id;
    console.log(`✅ 测试商品已创建 (ID: ${testProductId})`);
  });

  // TC-ORD-ONLINE-001：创建线上订单
  test('线上订单 - 创建线上订单状态为 pending_confirm', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: {
        product_id: testProductId,
        final_price: 90.00,
        transaction_type: 'online',
      },
    });
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.order.transaction_type).toBe('online');
    expect(data.order.status).toBe('pending_confirm');
    console.log(`✅ 线上订单已创建 (ID: ${data.order.id})`);
  });

  // TC-ORD-ONLINE-002：卖家确认订单 → pending_payment
  test('线上订单 - 卖家确认订单', async ({ request }) => {
    // 创建订单
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 50.00, category: '其他' },
    });
    const pid = (await prodRes.json()).product.id;

    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: pid, final_price: 45.00, transaction_type: 'online' },
    });
    const { order } = await orderRes.json();

    // 卖家确认
    const response = await request.put(`${API_BASE_URL}/api/orders/${order.id}/confirm`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).order.status).toBe('pending_payment');
    console.log(`✅ 卖家已确认订单 (ID: ${order.id}) → pending_payment`);
  });

  // TC-ORD-ONLINE-003：卖家关闭订单 → closed
  test('线上订单 - 卖家关闭订单', async ({ request }) => {
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 30.00, category: '其他' },
    });
    const pid = (await prodRes.json()).product.id;

    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: pid, final_price: 25.00, transaction_type: 'online' },
    });
    const { order } = await orderRes.json();

    const response = await request.put(`${API_BASE_URL}/api/orders/${order.id}/close`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).order.status).toBe('closed');
    console.log(`✅ 卖家已关闭订单 (ID: ${order.id}) → closed`);
  });

  // TC-ORD-ONLINE-004：完整支付流程
  test('线上订单 - 完整流程：确认→支付→发货(带快递单号)→收货', async ({ request }) => {
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 200.00, category: '其他' },
    });
    const pid = (await prodRes.json()).product.id;

    // 创建线上订单
    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: pid, final_price: 180.00, transaction_type: 'online' },
    });
    const { order } = await orderRes.json();
    expect(order.status).toBe('pending_confirm');
    console.log(`✅ 订单已创建 (ID: ${order.id})`);

    // 1. 卖家确认
    const confirmRes = await request.put(`${API_BASE_URL}/api/orders/${order.id}/confirm`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` },
    });
    expect(confirmRes.status()).toBe(200);
    expect((await confirmRes.json()).order.status).toBe('pending_payment');
    console.log(`  ① 卖家已确认 → pending_payment`);

    // 2. 买家付款
    const payRes = await request.post(`${API_BASE_URL}/api/orders/${order.id}/pay`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    expect(payRes.status()).toBe(200);
    const payData = await payRes.json();
    expect(payData.order.status).toBe('paid');
    expect(payData.order.paid_at).not.toBeNull();
    console.log(`  ② 买家已付款 → paid`);

    // 验证交易流水
    const txRes = await request.get(`${API_BASE_URL}/api/orders/${order.id}/transactions`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    expect(txRes.status()).toBe(200);
    const txData = await txRes.json();
    expect(txData.transactions.length).toBeGreaterThanOrEqual(1);
    expect(txData.transactions[0].type).toBe('pay');
    console.log(`  ③ 交易流水已记录 ✓`);

    // 3. 卖家发货（带快递单号）
    const deliverRes = await request.put(`${API_BASE_URL}/api/orders/${order.id}/deliver`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { tracking_number: 'SF1234567890' },
    });
    expect(deliverRes.status()).toBe(200);
    const deliverData = await deliverRes.json();
    expect(deliverData.order.status).toBe('delivered');
    expect(deliverData.order.auto_complete_at).not.toBeNull();
    expect(deliverData.order.tracking_number).toBe('SF1234567890');
    console.log(`  ④ 卖家已发货 → delivered (快递: SF1234567890)`);

    // 4. 买家确认收货
    const receiveRes = await request.put(`${API_BASE_URL}/api/orders/${order.id}/receive`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    expect(receiveRes.status()).toBe(200);
    expect((await receiveRes.json()).order.status).toBe('completed');
    console.log(`  ⑤ 买家已收货 → completed ✅`);

    // 验证商品已售出
    const prodCheck = await fetch(`${API_BASE_URL}/api/products/${pid}`);
    const prodData = await prodCheck.json();
    expect(prodData.product.status).toBe('sold');
  });

  // TC-ORD-ONLINE-005：退款流程
  test('线上订单 - 退款流程：申请→同意→ refunded', async ({ request }) => {
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 80.00, category: '其他' },
    });
    const pid = (await prodRes.json()).product.id;

    // 创建→确认→付款
    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: pid, final_price: 75.00, transaction_type: 'online' },
    });
    const { order } = await orderRes.json();

    await request.put(`${API_BASE_URL}/api/orders/${order.id}/confirm`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` },
    });
    await request.post(`${API_BASE_URL}/api/orders/${order.id}/pay`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });

    // 申请退款
    const refundReq = await request.post(`${API_BASE_URL}/api/orders/${order.id}/refund-request`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { reason: '商品与描述不符' },
    });
    expect(refundReq.status()).toBe(200);
    expect((await refundReq.json()).order.status).toBe('refunding');
    console.log(`  ① 退款已申请 → refunding`);

    // 卖家同意退款
    const agreeRes = await request.put(`${API_BASE_URL}/api/orders/${order.id}/refund-agree`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` },
    });
    expect(agreeRes.status()).toBe(200);
    expect((await agreeRes.json()).order.status).toBe('refunded');
    console.log(`  ② 卖家同意 → refunded ✅`);

    // 验证退款交易流水
    const txRes = await request.get(`${API_BASE_URL}/api/orders/${order.id}/transactions`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    const txData = await txRes.json();
    const refundTxs = txData.transactions.filter(t => t.type === 'refund');
    expect(refundTxs.length).toBe(1);
    console.log(`  ③ 退款交易流水已记录 ✓`);
  });

  // TC-ORD-ONLINE-006：退款被拒绝 → disputed
  test('线上订单 - 退款被拒绝进入纠纷流程', async ({ request }) => {
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 60.00, category: '其他' },
    });
    const pid = (await prodRes.json()).product.id;

    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: pid, final_price: 55.00, transaction_type: 'online' },
    });
    const { order } = await orderRes.json();

    await request.put(`${API_BASE_URL}/api/orders/${order.id}/confirm`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` },
    });
    await request.post(`${API_BASE_URL}/api/orders/${order.id}/pay`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });

    // 申请退款
    await request.post(`${API_BASE_URL}/api/orders/${order.id}/refund-request`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { reason: '不想要了' },
    });

    // 卖家拒绝退款
    const rejectRes = await request.put(`${API_BASE_URL}/api/orders/${order.id}/refund-reject`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` },
    });
    expect(rejectRes.status()).toBe(200);
    expect((await rejectRes.json()).order.status).toBe('disputed');
    console.log(`✅ 退款被拒绝 → disputed，等待平台介入`);
  });

  // TC-ORD-ONLINE-007：线上订单不能使用线下 complete 接口
  test('线上订单 - 不能使用线下的 complete 接口', async ({ request }) => {
    const product = generateTestProduct();
    const prodRes = await request.post(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${sellerToken}`, 'Content-Type': 'application/json' },
      data: { title: product.title, price: 40.00, category: '其他' },
    });
    const pid = (await prodRes.json()).product.id;

    const orderRes = await request.post(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${buyerToken}`, 'Content-Type': 'application/json' },
      data: { product_id: pid, final_price: 35.00, transaction_type: 'online' },
    });
    const { order } = await orderRes.json();

    const response = await request.put(`${API_BASE_URL}/api/orders/${order.id}/complete`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` },
    });
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('线上交易请使用确认收货接口');
  });
});
