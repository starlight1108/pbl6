from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO

from .config import config

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
socketio = SocketIO(cors_allowed_origins='*')


import os


def create_app(config_name='default'):
    app = Flask(__name__, static_folder='static', static_url_path='/static')
    app.config.from_object(config[config_name])

    os.makedirs(app.config['AVATAR_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PRODUCT_FOLDER'], exist_ok=True)

    @app.route('/uploads/<subfolder>/<path:filename>')
    def serve_upload(subfolder, filename):
        return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], subfolder), filename)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, origins=app.config['CORS_ORIGINS'], supports_credentials=True)
    socketio.init_app(app, cors_allowed_origins='*', namespace='/chat')
    from . import models
    from .routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    from .routes import chat
    chat.register_handlers(socketio)

    return app