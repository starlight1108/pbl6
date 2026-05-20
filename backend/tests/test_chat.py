import pytest
from app import db
from app.models import User, Product, ChatConversation, ChatMessage


@pytest.fixture
def second_user(client):
    client.post('/api/auth/register', json={
        'email': 'seller@edu.cn',
        'password': 'seller123',
        'nickname': '卖家张三'
    })

    response = client.post('/api/auth/login', json={
        'email': 'seller@edu.cn',
        'password': 'seller123'
    })

    assert response.status_code == 200
    token = response.json['access_token']
    return response.json['user'], {'Authorization': f'Bearer {token}'}


@pytest.fixture
def third_user(client):
    client.post('/api/auth/register', json={
        'email': 'stranger@edu.cn',
        'password': 'stranger123',
        'nickname': '路人甲'
    })

    response = client.post('/api/auth/login', json={
        'email': 'stranger@edu.cn',
        'password': 'stranger123'
    })

    assert response.status_code == 200
    token = response.json['access_token']
    return response.json['user'], {'Authorization': f'Bearer {token}'}


class TestConversation:

    def test_create_conversation_success(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            first_user = User.query.filter_by(email='test@edu.cn').first()
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        response = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)

        assert response.status_code == 201, f"Failed: {response.json}"
        assert response.json['message'] == 'Conversation created'
        assert response.json['conversation']['product_title'] == product.title
        assert response.json['conversation']['other_user']['nickname'] == '卖家张三'

    def test_create_conversation_reuses_existing(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        response1 = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        assert response1.status_code == 201

        response2 = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)

        assert response2.status_code == 200
        assert response2.json['conversation']['id'] == response1.json['conversation']['id']

    def test_create_conversation_missing_fields(self, client, auth_headers):
        response = client.post('/api/conversations', json={}, headers=auth_headers)
        assert response.status_code == 400

        response = client.post('/api/conversations', json={'seller_id': 1}, headers=auth_headers)
        assert response.status_code == 400

    def test_create_conversation_self_chat(self, client, auth_headers, create_test_products):
        with client.application.app_context():
            user = User.query.filter_by(email='test@edu.cn').first()
            product = Product.query.first()

        response = client.post('/api/conversations', json={
            'seller_id': user.id,
            'product_id': product.id
        }, headers=auth_headers)

        assert response.status_code == 400
        assert 'Cannot chat with yourself' in response.json['error']

    def test_create_conversation_seller_not_found(self, client, auth_headers, create_test_products):
        with client.application.app_context():
            product = Product.query.first()

        response = client.post('/api/conversations', json={
            'seller_id': 99999,
            'product_id': product.id
        }, headers=auth_headers)

        assert response.status_code == 404

    def test_create_conversation_no_auth(self, client, create_test_products):
        with client.application.app_context():
            product = Product.query.first()

        response = client.post('/api/conversations', json={
            'seller_id': 1,
            'product_id': product.id
        })
        assert response.status_code == 401

    def test_get_conversations_list(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)

        response = client.get('/api/conversations', headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json['conversations']) >= 1

    def test_get_conversations_empty(self, client, auth_headers):
        response = client.get('/api/conversations', headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json['conversations']) == 0

    def test_get_conversations_no_auth(self, client):
        response = client.get('/api/conversations')
        assert response.status_code == 401

    def test_get_conversations_last_message(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        client.post(f'/api/conversations/{conversation_id}/messages', json={
            'content': '你好，请问商品还在吗？'
        }, headers=auth_headers)

        response = client.get('/api/conversations', headers=auth_headers)
        assert response.status_code == 200
        conv = response.json['conversations'][0]
        assert conv['last_message'] == '你好，请问商品还在吗？'
        assert conv['last_message_at'] is not None


class TestMessages:

    def test_send_message_success(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        response = client.post(f'/api/conversations/{conversation_id}/messages', json={
            'content': '你好，请问商品还在吗？'
        }, headers=auth_headers)

        assert response.status_code == 201, f"Failed: {response.json}"
        assert response.json['message'] == 'Message sent'
        assert response.json['chat_message']['content'] == '你好，请问商品还在吗？'

    def test_send_message_empty_content(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        response = client.post(f'/api/conversations/{conversation_id}/messages', json={
            'content': ''
        }, headers=auth_headers)

        assert response.status_code == 400
        assert 'required' in response.json['error']

    def test_send_message_to_not_participant(self, client, auth_headers, second_user, third_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        _, headers3 = third_user

        response = client.post(f'/api/conversations/{conversation_id}/messages', json={
            'content': '你好'
        }, headers=headers3)

        assert response.status_code == 403

    def test_send_message_no_auth(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        response = client.post(f'/api/conversations/{conversation_id}/messages', json={
            'content': '你好'
        })

        assert response.status_code == 401

    def test_get_messages_history(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        client.post(f'/api/conversations/{conversation_id}/messages', json={
            'content': '第一条消息'
        }, headers=auth_headers)

        client.post(f'/api/conversations/{conversation_id}/messages', json={
            'content': '第二条消息'
        }, headers=auth_headers)

        response = client.get(f'/api/conversations/{conversation_id}/messages', headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json['messages']) == 2
        assert response.json['total'] == 2

    def test_get_messages_pagination(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        for i in range(5):
            client.post(f'/api/conversations/{conversation_id}/messages', json={
                'content': f'消息{i+1}'
            }, headers=auth_headers)

        response = client.get(f'/api/conversations/{conversation_id}/messages?per_page=3', headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json['messages']) == 3
        assert response.json['total'] == 5
        assert response.json['pages'] == 2

    def test_get_messages_unauthorized(self, client, auth_headers, second_user, third_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        _, headers3 = third_user

        response = client.get(f'/api/conversations/{conversation_id}/messages', headers=headers3)
        assert response.status_code == 403

    def test_get_messages_conversation_not_found(self, client, auth_headers):
        response = client.get('/api/conversations/99999/messages', headers=auth_headers)
        assert response.status_code == 404

    def test_mark_read(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        response = client.put(f'/api/conversations/{conversation_id}/read', headers=auth_headers)
        assert response.status_code == 200
        assert response.json['message'] == 'Messages marked as read'

    def test_unread_count(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        response = client.get('/api/conversations/unread-count', headers=auth_headers)
        assert response.status_code == 200
        assert 'total_unread' in response.json

    def test_conversation_has_unread_count(self, client, auth_headers, second_user, create_test_products):
        with client.application.app_context():
            seller = User.query.filter_by(email='seller@edu.cn').first()
            product = Product.query.first()

        conv_resp = client.post('/api/conversations', json={
            'seller_id': seller.id,
            'product_id': product.id
        }, headers=auth_headers)
        conversation_id = conv_resp.json['conversation']['id']

        response = client.get('/api/conversations', headers=auth_headers)
        assert response.status_code == 200
        conv = response.json['conversations'][0]
        assert 'unread_count' in conv

    def test_get_online_users(self, client):
        response = client.get('/api/users/online-status')
        assert response.status_code == 200
        assert 'online_user_ids' in response.json
