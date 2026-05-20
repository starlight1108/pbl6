from flask import Blueprint, jsonify

api_bp = Blueprint('api', __name__)


@api_bp.route('/')
def index():
    return jsonify({'message': 'API is running'})


from . import auth, product, user, notification, report
