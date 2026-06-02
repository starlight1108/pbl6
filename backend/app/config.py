import os
from datetime import timedelta
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
backend_dir = os.path.dirname(basedir)
load_dotenv(os.path.join(backend_dir, '.env'))


def get_database_uri():
    db_url = os.environ.get('DATABASE_URL')
    if db_url and db_url.startswith('sqlite:///'):
        db_path = db_url.replace('sqlite:///', '')
        if not os.path.isabs(db_path):
            backend_dir = os.path.dirname(basedir)
            db_path = os.path.join(backend_dir, db_path)
        return f'sqlite:///{db_path}'
    return db_url


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(weeks=1)
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173']
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    UPLOAD_FOLDER = os.path.join(backend_dir, 'uploads')
    AVATAR_FOLDER = os.path.join(UPLOAD_FOLDER, 'avatars')
    PRODUCT_FOLDER = os.path.join(UPLOAD_FOLDER, 'products')
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff', 'tif'}


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-secret'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    UPLOAD_FOLDER = os.path.join(backend_dir, 'test_uploads')
    AVATAR_FOLDER = os.path.join(UPLOAD_FOLDER, 'avatars')
    PRODUCT_FOLDER = os.path.join(UPLOAD_FOLDER, 'products')


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}