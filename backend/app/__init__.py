from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

from .config import config

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()


import os


def create_app(config_name='default'):
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    app.config.from_object(config[config_name])

    os.makedirs(app.config['AVATAR_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PRODUCT_FOLDER'], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)

    from . import models
    from .routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    return app
