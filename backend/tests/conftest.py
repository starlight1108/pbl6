import pytest
from app import create_app, db


@pytest.fixture
def app():
    app = create_app('testing')

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


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
