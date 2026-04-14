from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

from .config import config

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()


def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)

    from . import models
    from .routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    return app
