import pytest


class TestUserRegister:

    def test_register_success(self, client):
        response = client.post('/api/auth/register', json={
            'email': 'user@edu.cn',
            'password': 'password123',
            'nickname': 'testuser'
        })

        assert response.status_code == 201
        assert response.json['message'] == 'Registration successful'
        assert response.json['user']['email'] == 'user@edu.cn'
        assert response.json['user']['nickname'] == 'testuser'

    def test_register_missing_fields(self, client):
        response = client.post('/api/auth/register', json={
            'email': 'user@edu.cn'
        })

        assert response.status_code == 400
        assert 'Missing required fields' in response.json['error']

    def test_register_duplicate_email(self, client):
        client.post('/api/auth/register', json={
            'email': 'user@edu.cn',
            'password': 'password123'
        })

        response = client.post('/api/auth/register', json={
            'email': 'user@edu.cn',
            'password': 'anotherpass'
        })

        assert response.status_code == 409
        assert response.json['error'] == 'Email already registered'

    def test_register_default_nickname(self, client):
        response = client.post('/api/auth/register', json={
            'email': 'user@edu.cn',
            'password': 'password123'
        })

        assert response.status_code == 201
        assert response.json['user']['nickname'] == 'user'


class TestUserLogin:

    def test_login_success(self, client):
        client.post('/api/auth/register', json={
            'email': 'user@edu.cn',
            'password': 'password123'
        })

        response = client.post('/api/auth/login', json={
            'email': 'user@edu.cn',
            'password': 'password123'
        })

        assert response.status_code == 200
        assert response.json['message'] == 'Login successful'
        assert 'access_token' in response.json
        assert response.json['user']['email'] == 'user@edu.cn'

    def test_login_missing_fields(self, client):
        response = client.post('/api/auth/login', json={
            'email': 'user@edu.cn'
        })

        assert response.status_code == 400
        assert 'Missing email or password' in response.json['error']

    def test_login_wrong_password(self, client):
        client.post('/api/auth/register', json={
            'email': 'user@edu.cn',
            'password': 'password123'
        })

        response = client.post('/api/auth/login', json={
            'email': 'user@edu.cn',
            'password': 'wrongpass'
        })

        assert response.status_code == 401
        assert response.json['error'] == 'Invalid email or password'

    def test_login_user_not_exist(self, client):
        response = client.post('/api/auth/login', json={
            'email': 'nonexist@edu.cn',
            'password': 'password123'
        })

        assert response.status_code == 401
        assert response.json['error'] == 'Invalid email or password'
