import pytest
import io
from PIL import Image


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
        assert 'default-product.png' in response.json['product']['image']

    def test_create_product_with_image(self, client, auth_headers):
        img = Image.new('RGB', (600, 600), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)

        response = client.post(
            '/api/products',
            data={
                'title': '带图商品',
                'price': 99.99,
                'description': '有图片的商品',
                'category': '电子数码',
                'image': (img_bytes, 'product.jpg')
            },
            content_type='multipart/form-data',
            headers=auth_headers
        )

        assert response.status_code == 201, f"Failed: {response.json}"
        assert response.json['message'] == 'Product created successfully'
        assert 'default-product.png' not in response.json['product']['image']
        assert '/static/products/' in response.json['product']['image']

    def test_create_product_missing_title(self, client, auth_headers):
        response = client.post('/api/products', json={
            'price': 29.99,
        }, headers=auth_headers)

        assert response.status_code == 400
        assert 'Missing required fields' in response.json['error']

    def test_create_product_missing_price(self, client, auth_headers):
        response = client.post('/api/products', json={
            'title': '二手教材',
        }, headers=auth_headers)

        assert response.status_code == 400
        assert 'Missing required fields' in response.json['error']

    def test_create_product_default_category(self, client, auth_headers):
        response = client.post('/api/products', json={
            'title': '二手教材',
            'price': 29.99,
        }, headers=auth_headers)

        assert response.status_code == 201
        assert response.json['product']['category'] == '其他'

    def test_create_product_no_auth(self, client):
        response = client.post('/api/products', json={
            'title': '二手教材',
            'price': 29.99,
        })

        assert response.status_code == 401


class TestGetProducts:

    def test_get_products_list(self, client, create_test_products):
        response = client.get('/api/products')

        assert response.status_code == 200
        assert len(response.json['products']) == 3
        assert 'default-product.png' in response.json['products'][0]['image']

    def test_get_products_category_filter(self, client, create_test_products):
        response = client.get('/api/products?category=书籍教材')

        assert response.status_code == 200
        assert len(response.json['products']) == 1

    def test_get_products_keyword_search(self, client, create_test_products):
        response = client.get('/api/products?keyword=Python')

        assert response.status_code == 200
        assert len(response.json['products']) == 1

    def test_get_products_pagination(self, client, create_many_products):
        response = client.get('/api/products?page=1&per_page=10')

        assert response.status_code == 200
        assert len(response.json['products']) == 10
        assert response.json['total'] == 15
        assert response.json['pages'] == 2
        assert response.json['current_page'] == 1


class TestGetProductDetail:

    def test_get_product_detail_success(self, client, create_test_products):
        response = client.get('/api/products')
        product_id = response.json['products'][0]['id']
        response = client.get(f'/api/products/{product_id}')

        assert response.status_code == 200
        assert 'product' in response.json
        assert response.json['product']['id'] == product_id
        assert 'default-product.png' in response.json['product']['image']

    def test_get_product_detail_not_found(self, client):
        response = client.get('/api/products/99999')

        assert response.status_code == 404
        assert 'not found' in response.json['error']
