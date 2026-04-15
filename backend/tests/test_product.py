import pytest


class TestCreateProduct:

    def test_create_product_success(self, client, auth_headers):
        response = client.post('/api/products', json={
            'title': '二手教材',
            'price': 29.99,
            'description': '9成新教材',
            'category': '书籍教材'
        }, headers=auth_headers)

        assert response.status_code == 201, f"Failed: {response.json}"
        assert response.json['message'] == 'Product created successfully'
        assert response.json['product']['title'] == '二手教材'
        assert response.json['product']['price'] == 29.99
        assert response.json['product']['status'] == 'active'

    def test_create_product_missing_title(self, client, auth_headers):
        response = client.post('/api/products', json={
            'price': 29.99
        }, headers=auth_headers)

        assert response.status_code == 400, f"Failed: {response.json}"
        assert 'Missing required fields' in response.json['error']

    def test_create_product_missing_price(self, client, auth_headers):
        response = client.post('/api/products', json={
            'title': '二手教材'
        }, headers=auth_headers)

        assert response.status_code == 400, f"Failed: {response.json}"
        assert 'Missing required fields' in response.json['error']

    def test_create_product_default_category(self, client, auth_headers):
        response = client.post('/api/products', json={
            'title': '二手商品',
            'price': 10.00
        }, headers=auth_headers)

        assert response.status_code == 201, f"Failed: {response.json}"
        assert response.json['product']['category'] == '其他'

    def test_create_product_no_auth(self, client):
        response = client.post('/api/products', json={
            'title': '二手教材',
            'price': 29.99
        })

        assert response.status_code == 401


class TestGetProducts:

    def test_get_products_empty(self, client):
        response = client.get('/api/products')

        assert response.status_code == 200
        assert response.json['products'] == []
        assert response.json['total'] == 0

    def test_get_products_list(self, client, auth_headers):
        for i in range(3):
            r = client.post('/api/products', json={
                'title': f'商品{i + 1}',
                'price': 10.00 * (i + 1),
                'category': '书籍教材'
            }, headers=auth_headers)
            assert r.status_code == 201, f"Create product {i+1} failed: {r.json}"

        response = client.get('/api/products')

        assert response.status_code == 200
        assert len(response.json['products']) == 3
        assert response.json['total'] == 3
        assert response.json['products'][0]['title'] == '商品3'

    def test_get_products_category_filter(self, client, auth_headers):
        r = client.post('/api/products', json={
            'title': '书籍',
            'price': 10.00,
            'category': '书籍教材'
        }, headers=auth_headers)
        assert r.status_code == 201

        r = client.post('/api/products', json={
            'title': '手机',
            'price': 100.00,
            'category': '电子数码'
        }, headers=auth_headers)
        assert r.status_code == 201

        response = client.get('/api/products?category=书籍教材')

        assert response.status_code == 200
        assert len(response.json['products']) == 1
        assert response.json['products'][0]['title'] == '书籍'

    def test_get_products_keyword_search(self, client, auth_headers):
        r = client.post('/api/products', json={
            'title': 'Python编程教材',
            'price': 30.00
        }, headers=auth_headers)
        assert r.status_code == 201

        r = client.post('/api/products', json={
            'title': 'Java编程教材',
            'price': 35.00
        }, headers=auth_headers)
        assert r.status_code == 201

        response = client.get('/api/products?keyword=Python')

        assert response.status_code == 200
        assert len(response.json['products']) == 1
        assert response.json['products'][0]['title'] == 'Python编程教材'

    def test_get_products_pagination(self, client, auth_headers):
        for i in range(25):
            r = client.post('/api/products', json={
                'title': f'商品{i + 1}',
                'price': 10.00
            }, headers=auth_headers)
            assert r.status_code == 201

        response = client.get('/api/products?page=1&per_page=10')
        assert len(response.json['products']) == 10
        assert response.json['pages'] == 3
        assert response.json['current_page'] == 1

        response = client.get('/api/products?page=2&per_page=10')
        assert len(response.json['products']) == 10
        assert response.json['current_page'] == 2


class TestGetProductDetail:

    def test_get_product_detail_success(self, client, auth_headers):
        create_response = client.post('/api/products', json={
            'title': '测试商品',
            'price': 99.99,
            'description': '详细描述',
            'category': '书籍教材'
        }, headers=auth_headers)

        assert create_response.status_code == 201, f"Create failed: {create_response.json}"
        assert 'product' in create_response.json, f"No product key: {create_response.json}"

        product_id = create_response.json['product']['id']

        response = client.get(f'/api/products/{product_id}')

        assert response.status_code == 200
        assert response.json['product']['title'] == '测试商品'
        assert response.json['product']['price'] == 99.99
        assert response.json['product']['description'] == '详细描述'

    def test_get_product_detail_not_found(self, client):
        response = client.get('/api/products/99999')

        assert response.status_code == 404
        assert response.json['error'] == 'Product not found'
