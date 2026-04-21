import pytest
import os
import shutil
from app import create_app, db
from app.models import User, Product


@pytest.fixture
def app():
    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

    for folder in [app.config['AVATAR_FOLDER'], app.config['PRODUCT_FOLDER']]:
        if os.path.exists(folder):
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)
                try:
                    if os.path.isfile(file_path):
                        os.unlink(file_path)
                except Exception as e:
                    print(f'清理测试文件失败: {e}')


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    client.post('/api/auth/register', json={
        'email': 'test@edu.cn',
        'password': 'test123456'
    })

    response = client.post('/api/auth/login', json={
        'email': 'test@edu.cn',
        'password': 'test123456'
    })

    assert response.status_code == 200, f"Login failed: {response.json}"
    assert 'access_token' in response.json, f"No token: {response.json}"

    token = response.json['access_token']
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def create_test_products(app, auth_headers, client):
    with app.app_context():
        user = User.query.first()
        products = [
            Product(seller_id=user.id, title='Python编程入门', price=39.99, category='书籍教材', status='active'),
            Product(seller_id=user.id, title='机械键盘', price=129.00, category='电子数码', status='active'),
            Product(seller_id=user.id, title='羽毛球拍', price=50.00, category='运动健身', status='active'),
        ]
        db.session.add_all(products)
        db.session.commit()
        return products


@pytest.fixture
def create_many_products(app, auth_headers, client):
    with app.app_context():
        user = User.query.first()
        products = []
        for i in range(15):
            products.append(Product(
                seller_id=user.id,
                title=f'商品{i+1}',
                price=10.00 + i,
                category='测试分类',
                status='active'
            ))
        db.session.add_all(products)
        db.session.commit()
        return products
