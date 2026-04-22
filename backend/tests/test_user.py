import pytest
import io
from PIL import Image


class TestUserAvatar:

    def test_get_profile_has_default_avatar(self, client, auth_headers):
        response = client.get('/api/user/profile', headers=auth_headers)

        assert response.status_code == 200
        assert 'default-avatar.png' in response.json['user']['avatar']

    def test_upload_avatar_success(self, client, auth_headers):
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        response = client.post(
            '/api/user/avatar',
            data={'avatar': (img_bytes, 'test.png')},
            content_type='multipart/form-data',
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json['message'] == 'Avatar uploaded successfully'
        assert 'default-avatar.png' not in response.json['user']['avatar']
        assert '/static/avatars/' in response.json['user']['avatar']

    def test_upload_avatar_no_file(self, client, auth_headers):
        response = client.post(
            '/api/user/avatar',
            data={},
            content_type='multipart/form-data',
            headers=auth_headers
        )

        assert response.status_code == 400
        assert 'No avatar' in response.json['error']

    def test_upload_avatar_invalid_type(self, client, auth_headers):
        file_content = io.BytesIO(b'test content')

        response = client.post(
            '/api/user/avatar',
            data={'avatar': (file_content, 'test.txt')},
            content_type='multipart/form-data',
            headers=auth_headers
        )

        assert response.status_code == 400
        assert 'Invalid file type' in response.json['error']

    def test_upload_avatar_no_auth(self, client):
        response = client.post('/api/user/avatar')

        assert response.status_code == 401

    def test_get_profile_no_auth(self, client):
        response = client.get('/api/user/profile')

        assert response.status_code == 401
