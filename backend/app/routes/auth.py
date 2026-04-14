from flask import request, jsonify
from flask_jwt_extended import create_access_token
from . import api_bp
from .. import db
from ..models import User


@api_bp.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()

    if not all(k in data for k in ['email', 'password']):
        return jsonify({'error': 'Missing required fields: email, password'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(
        email=data['email'],
        nickname=data.get('nickname', data['email'].split('@')[0])
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'Registration successful',
        'user': user.to_dict()
    }), 201


@api_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()

    if not all(k in data for k in ['email', 'password']):
        return jsonify({'error': 'Missing email or password'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    access_token = create_access_token(identity=user.id)

    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token
    })
