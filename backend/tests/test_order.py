import pytest
from app import db
from app.models import User, Product, Order, Transaction


@pytest.fixture
def stranger_user(client):
    """创建一个第三方用户（非买家也非卖家）"""
    client.post('/api/auth/register', json={
        'email': 'stranger@test.edu.cn',
        'password': 'stranger123',
        'nickname': '路人甲'
    })
    response = client.post('/api/auth/login', json={
        'email': 'stranger@test.edu.cn',
        'password': 'stranger123'
    })
    token = response.json['access_token']
    return response.json['user'], {'Authorization': f'Bearer {token}'}


@pytest.fixture
def seller_with_products(app, client):
    """创建一个卖家账号并发布商品"""
    # 注册卖家
    client.post('/api/auth/register', json={
        'email': 'seller@test.edu.cn',
        'password': 'seller123',
        'nickname': '卖家小王'
    })
    response = client.post('/api/auth/login', json={
        'email': 'seller@test.edu.cn',
        'password': 'seller123'
    })
    seller_token = response.json['access_token']
    seller_headers = {'Authorization': f'Bearer {seller_token}'}
    seller_user = response.json['user']

    # 卖家发布商品
    with app.app_context():
        seller = User.query.filter_by(email='seller@test.edu.cn').first()
        product = Product(
            seller_id=seller.id,
            title='高等数学教材',
            price=35.00,
            category='书籍教材',
            status='active'
        )
        db.session.add(product)
        db.session.commit()
        product_id = product.id

    return {
        'seller_user': seller_user,
        'seller_headers': seller_headers,
        'product_id': product_id,
        'product_title': '高等数学教材',
        'product_price': 35.00
    }


class TestOfflineOrder:
    """线下交易流程测试（原始流程向后兼容）"""

    def test_create_offline_order_success(self, client, auth_headers, seller_with_products):
        """买家创建线下订单成功后状态为 pending"""
        response = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'offline'
        }, headers=auth_headers)

        assert response.status_code == 201, f"Failed: {response.json}"
        assert response.json['order']['status'] == 'pending'
        assert response.json['order']['transaction_type'] == 'offline'
        assert response.json['order']['final_price'] == seller_with_products['product_price']

    def test_create_offline_order_default_type(self, client, auth_headers, seller_with_products):
        """不传 transaction_type 时默认为 offline"""
        response = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price']
        }, headers=auth_headers)

        assert response.status_code == 201
        assert response.json['order']['transaction_type'] == 'offline'

    def test_complete_offline_order(self, client, auth_headers, seller_with_products):
        """买家确认完成线下订单"""
        # 创建订单
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'offline'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']

        # 确认完成
        response = client.put(f'/api/orders/{order_id}/complete', headers=auth_headers)
        assert response.status_code == 200
        assert response.json['order']['status'] == 'completed'

    def test_cancel_offline_order(self, client, auth_headers, seller_with_products):
        """买家取消线下订单"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'offline'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']

        response = client.put(f'/api/orders/{order_id}/cancel', headers=auth_headers)
        assert response.status_code == 200
        assert response.json['order']['status'] == 'cancelled'

    def test_cannot_complete_non_pending_offline(self, client, auth_headers, seller_with_products):
        """已完成或取消的线下订单不能再次完成"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'offline'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']

        # 先完成
        client.put(f'/api/orders/{order_id}/complete', headers=auth_headers)
        # 再尝试完成
        response = client.put(f'/api/orders/{order_id}/complete', headers=auth_headers)
        assert response.status_code == 400

    def test_offline_order_seller_cancel(self, client, auth_headers, seller_with_products):
        """卖家也能取消线下订单"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'offline'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']

        # 卖家取消
        response = client.put(f'/api/orders/{order_id}/cancel',
                              headers=seller_with_products['seller_headers'])
        assert response.status_code == 200
        assert response.json['order']['status'] == 'cancelled'

    def test_offline_order_no_auth(self, client, seller_with_products):
        """未认证不能创建订单"""
        response = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'offline'
        })
        assert response.status_code == 401


class TestOnlineOrder:
    """线上交易流程测试（闲鱼式担保交易）"""

    def test_create_online_order_pending_confirm(self, client, auth_headers, seller_with_products):
        """创建线上订单后状态为 pending_confirm"""
        response = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)

        assert response.status_code == 201, f"Failed: {response.json}"
        assert response.json['order']['status'] == 'pending_confirm'
        assert response.json['order']['transaction_type'] == 'online'

    def test_seller_confirm_order(self, client, auth_headers, seller_with_products):
        """卖家确认线上订单 → pending_payment"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']

        response = client.put(f'/api/orders/{order_id}/confirm',
                              headers=seller_with_products['seller_headers'])
        assert response.status_code == 200
        assert response.json['order']['status'] == 'pending_payment'

    def test_seller_close_order(self, client, auth_headers, seller_with_products):
        """卖家关闭线上订单 → closed"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']

        response = client.put(f'/api/orders/{order_id}/close',
                              headers=seller_with_products['seller_headers'])
        assert response.status_code == 200
        assert response.json['order']['status'] == 'closed'

    def test_buyer_pay_order(self, client, auth_headers, seller_with_products):
        """买家付款 → paid + 创建交易流水"""
        # 创建并确认
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']
        client.put(f'/api/orders/{order_id}/confirm',
                   headers=seller_with_products['seller_headers'])

        # 付款
        response = client.post(f'/api/orders/{order_id}/pay', headers=auth_headers)
        assert response.status_code == 200
        assert response.json['order']['status'] == 'paid'
        assert response.json['order']['paid_at'] is not None

        # 验证交易流水
        tx_response = client.get(f'/api/orders/{order_id}/transactions', headers=auth_headers)
        assert tx_response.status_code == 200
        assert len(tx_response.json['transactions']) >= 1
        assert tx_response.json['transactions'][0]['type'] == 'pay'
        assert tx_response.json['transactions'][0]['amount'] == seller_with_products['product_price']

    def test_seller_deliver_order(self, client, auth_headers, seller_with_products):
        """卖家标记已发货 → delivered + 可填写快递单号"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']
        client.put(f'/api/orders/{order_id}/confirm',
                   headers=seller_with_products['seller_headers'])
        client.post(f'/api/orders/{order_id}/pay', headers=auth_headers)

        # 卖家发货（带快递单号）
        response = client.put(f'/api/orders/{order_id}/deliver',
                              json={'tracking_number': 'SF1234567890'},
                              headers=seller_with_products['seller_headers'])
        assert response.status_code == 200
        assert response.json['order']['status'] == 'delivered'
        assert response.json['order']['tracking_number'] == 'SF1234567890'
        assert response.json['order']['auto_complete_at'] is not None

    def test_seller_deliver_without_tracking(self, client, auth_headers, seller_with_products):
        """卖家发货时不填快递单号也能成功"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']
        client.put(f'/api/orders/{order_id}/confirm',
                   headers=seller_with_products['seller_headers'])
        client.post(f'/api/orders/{order_id}/pay', headers=auth_headers)

        response = client.put(f'/api/orders/{order_id}/deliver',
                              json={},
                              headers=seller_with_products['seller_headers'])
        assert response.status_code == 200
        assert response.json['order']['status'] == 'delivered'
        assert response.json['order']['tracking_number'] is None

    def test_buyer_receive_order(self, client, auth_headers, seller_with_products):
        """买家确认收货 → completed + 释放资金"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']
        client.put(f'/api/orders/{order_id}/confirm',
                   headers=seller_with_products['seller_headers'])
        client.post(f'/api/orders/{order_id}/pay', headers=auth_headers)
        client.put(f'/api/orders/{order_id}/deliver',
                   headers=seller_with_products['seller_headers'])

        # 确认收货
        response = client.put(f'/api/orders/{order_id}/receive', headers=auth_headers)
        assert response.status_code == 200
        assert response.json['order']['status'] == 'completed'

    def test_refund_flow(self, client, auth_headers, seller_with_products):
        """退款流程：申请 → 卖家同意 → refunded"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']
        client.put(f'/api/orders/{order_id}/confirm',
                   headers=seller_with_products['seller_headers'])
        client.post(f'/api/orders/{order_id}/pay', headers=auth_headers)

        # 申请退款
        refund_resp = client.post(f'/api/orders/{order_id}/refund-request',
                                  json={'reason': '不想要了'},
                                  headers=auth_headers)
        assert refund_resp.status_code == 200
        assert refund_resp.json['order']['status'] == 'refunding'

        # 卖家同意退款
        agree_resp = client.put(f'/api/orders/{order_id}/refund-agree',
                                headers=seller_with_products['seller_headers'])
        assert agree_resp.status_code == 200
        assert agree_resp.json['order']['status'] == 'refunded'

        # 验证退款交易流水
        tx_response = client.get(f'/api/orders/{order_id}/transactions', headers=auth_headers)
        transactions = tx_response.json['transactions']
        refund_tx = [t for t in transactions if t['type'] == 'refund']
        assert len(refund_tx) == 1

    def test_refund_reject_flow(self, client, auth_headers, seller_with_products):
        """退款流程：申请 → 卖家拒绝 → disputed"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']
        client.put(f'/api/orders/{order_id}/confirm',
                   headers=seller_with_products['seller_headers'])
        client.post(f'/api/orders/{order_id}/pay', headers=auth_headers)

        # 申请退款
        client.post(f'/api/orders/{order_id}/refund-request',
                    json={'reason': '不想要了'},
                    headers=auth_headers)

        # 卖家拒绝退款
        reject_resp = client.put(f'/api/orders/{order_id}/refund-reject',
                                 json={'reason': '商品无质量问题'},
                                 headers=seller_with_products['seller_headers'])
        assert reject_resp.status_code == 200
        assert reject_resp.json['order']['status'] == 'disputed'

    def test_online_order_cannot_complete(self, client, auth_headers, seller_with_products):
        """线上订单不能使用线下 complete 接口"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']

        response = client.put(f'/api/orders/{order_id}/complete', headers=auth_headers)
        assert response.status_code == 400
        assert '线上交易' in response.json['error'] or 'online' in response.json['error'].lower()

    def test_buyer_cannot_create_own_product_order(self, client, auth_headers, seller_with_products):
        """不能购买自己的商品"""
        # 用卖家账号创建自己商品的订单
        response = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=seller_with_products['seller_headers'])
        assert response.status_code == 400


class TestOrderPermissions:
    """订单权限测试"""

    def test_stranger_cannot_confirm(self, client, auth_headers, seller_with_products, stranger_user):
        """非卖家不能确认订单"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'online'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']

        # 陌生人尝试确认
        response = client.put(f'/api/orders/{order_id}/confirm',
                              headers=stranger_user[1])
        assert response.status_code == 403

    def test_stranger_cannot_view_order(self, client, auth_headers, seller_with_products, stranger_user):
        """非参与者不能查看订单"""
        order_resp = client.post('/api/orders', json={
            'product_id': seller_with_products['product_id'],
            'final_price': seller_with_products['product_price'],
            'transaction_type': 'offline'
        }, headers=auth_headers)
        order_id = order_resp.json['order']['id']

        response = client.get(f'/api/orders/{order_id}',
                              headers=stranger_user[1])
        assert response.status_code == 403
