from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import User
from ..utils import allowed_file, save_image


@api_bp.route('/user/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'avatar' not in request.files:
        return jsonify({'error': 'No avatar file provided'}), 400

    file = request.files['avatar']

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if not allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
        return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp, bmp, tiff'}), 400

    try:
        filename = save_image(file, current_app.config['AVATAR_FOLDER'], max_size=(200, 200))

        user.avatar = filename
        db.session.commit()

        return jsonify({
            'message': 'Avatar uploaded successfully',
            'user': user.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'user': user.to_dict()
    })


@api_bp.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}

    if 'nickname' in data and data['nickname']:
        user.nickname = data['nickname']

    if 'avatar' in request.files:
        file = request.files['avatar']
        if not file or not file.filename:
            return jsonify({'error': 'No selected file'}), 400
        if not allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
            return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp, bmp, tiff'}), 400
        try:
            filename = save_image(file, current_app.config['AVATAR_FOLDER'], max_size=(200, 200))
            user.avatar = filename
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    db.session.commit()

    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict()
    })
