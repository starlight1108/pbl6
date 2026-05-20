from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from flask_socketio import emit, join_room, leave_room
from . import api_bp
from .. import db
from ..models import User, ChatConversation, ChatMessage
from datetime import datetime, timezone

active_users = {}


def register_handlers(socketio):

    @socketio.on('connect', namespace='/chat')
    def handle_connect():
        pass

    @socketio.on('authenticate', namespace='/chat')
    def handle_authenticate(data):
        user_id = data.get('user_id')
        token = data.get('token')

        if not user_id or not token:
            emit('auth_error', {'message': 'Missing user_id or token'})
            return

        try:
            decoded = decode_token(token)
            token_user_id = int(decoded['sub'])
        except Exception:
            emit('auth_error', {'message': 'Invalid or expired token'})
            return

        user_id_int = int(user_id)

        if token_user_id != user_id_int:
            emit('auth_error', {'message': 'Token does not match user_id'})
            return

        user = User.query.get(user_id_int)
        if not user:
            emit('auth_error', {'message': 'User not found'})
            return

        active_users[user_id_int] = request.sid
        conversations = ChatConversation.query.filter(
            db.or_(ChatConversation.buyer_id == user_id_int, ChatConversation.seller_id == user_id_int)
        ).all()
        for conv in conversations:
            join_room(f'conversation_{conv.id}')
        join_room(f'user_{user_id_int}')
        emit('authenticated', {'user_id': user_id_int, 'online_users': list(active_users.keys())})
        emit('user_status', {'user_id': user_id_int, 'status': 'online'}, broadcast=True, include_self=False)

    @socketio.on('disconnect', namespace='/chat')
    def handle_disconnect():
        user_id = None
        for uid, sid in list(active_users.items()):
            if sid == request.sid:
                user_id = uid
                del active_users[uid]
                break
        if user_id:
            emit('user_status', {'user_id': user_id, 'status': 'offline'}, broadcast=True, include_self=False)

    @socketio.on('broadcast_message', namespace='/chat')
    def handle_broadcast_message(data):
        conversation_id = data.get('conversation_id')
        message = data.get('message')

        if not conversation_id or not message:
            return

        emit('new_message', message, room=f'conversation_{conversation_id}')
        emit('unread_update', {
            'conversation_id': conversation_id,
        }, room=f'conversation_{conversation_id}')

    @socketio.on('typing', namespace='/chat')
    def handle_typing(data):
        conversation_id = data.get('conversation_id')
        user_id = data.get('user_id')
        is_typing = data.get('is_typing', False)

        if conversation_id and user_id:
            emit('user_typing', {
                'conversation_id': conversation_id,
                'user_id': user_id,
                'is_typing': is_typing
            }, room=f'conversation_{conversation_id}', include_self=False)


@api_bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    user_id = int(get_jwt_identity())

    conversations = ChatConversation.query.filter(
        db.or_(ChatConversation.buyer_id == user_id, ChatConversation.seller_id == user_id)
    ).order_by(ChatConversation.last_message_at.desc().nullslast(), ChatConversation.created_at.desc()).all()

    return jsonify({
        'conversations': [c.to_dict(current_user_id=user_id) for c in conversations]
    }), 200


@api_bp.route('/conversations', methods=['POST'])
@jwt_required()
def create_conversation():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    seller_id = data.get('seller_id')
    product_id = data.get('product_id')

    if not seller_id or not product_id:
        return jsonify({'error': 'Missing seller_id or product_id'}), 400

    if int(seller_id) == user_id:
        return jsonify({'error': 'Cannot chat with yourself'}), 400

    seller = User.query.get(int(seller_id))
    if not seller:
        return jsonify({'error': 'Seller not found'}), 404

    buyer_id = min(user_id, int(seller_id))
    seller_id_ordered = max(user_id, int(seller_id))

    conversation = ChatConversation.query.filter_by(
        buyer_id=buyer_id,
        seller_id=seller_id_ordered,
        product_id=int(product_id)
    ).first()

    if conversation:
        return jsonify({'conversation': conversation.to_dict(current_user_id=user_id)}), 200

    conversation = ChatConversation(
        buyer_id=buyer_id,
        seller_id=seller_id_ordered,
        product_id=int(product_id)
    )
    db.session.add(conversation)
    db.session.commit()

    return jsonify({
        'message': 'Conversation created',
        'conversation': conversation.to_dict(current_user_id=user_id)
    }), 201


@api_bp.route('/conversations/<int:conversation_id>/messages', methods=['GET'])
@jwt_required()
def get_messages(conversation_id):
    user_id = int(get_jwt_identity())

    conversation = ChatConversation.query.get(conversation_id)
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404

    if user_id not in [conversation.buyer_id, conversation.seller_id]:
        return jsonify({'error': 'Not a participant'}), 403

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    pagination = ChatMessage.query.filter_by(conversation_id=conversation_id)\
        .order_by(ChatMessage.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'messages': [m.to_dict() for m in reversed(pagination.items)],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    }), 200


@api_bp.route('/conversations/<int:conversation_id>/messages', methods=['POST'])
@jwt_required()
def send_message(conversation_id):
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    conversation = ChatConversation.query.get(conversation_id)
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404

    if user_id not in [conversation.buyer_id, conversation.seller_id]:
        return jsonify({'error': 'Not a participant'}), 403

    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Message content is required'}), 400

    if len(content) > 2000:
        return jsonify({'error': 'Message too long'}), 400

    message = ChatMessage(
        conversation_id=conversation_id,
        sender_id=user_id,
        content=content,
        is_read=False
    )
    conversation.last_message = content
    conversation.last_message_at = datetime.now(timezone.utc)

    db.session.add(message)
    db.session.commit()

    return jsonify({
        'message': 'Message sent',
        'chat_message': message.to_dict()
    }), 201


@api_bp.route('/conversations/<int:conversation_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(conversation_id):
    user_id = int(get_jwt_identity())

    conversation = ChatConversation.query.get(conversation_id)
    if not conversation:
        return jsonify({'error': 'Conversation not found'}), 404

    if user_id not in [conversation.buyer_id, conversation.seller_id]:
        return jsonify({'error': 'Not a participant'}), 403

    ChatMessage.query.filter_by(
        conversation_id=conversation_id,
        is_read=False
    ).filter(ChatMessage.sender_id != user_id).update({'is_read': True})
    db.session.commit()

    return jsonify({'message': 'Messages marked as read'}), 200


@api_bp.route('/conversations/unread-count', methods=['GET'])
@jwt_required()
def get_chat_unread_count():
    user_id = int(get_jwt_identity())

    conversations = ChatConversation.query.filter(
        db.or_(ChatConversation.buyer_id == user_id, ChatConversation.seller_id == user_id)
    ).all()

    total_unread = 0
    for conv in conversations:
        other_id = conv.seller_id if user_id == conv.buyer_id else conv.buyer_id
        count = ChatMessage.query.filter_by(
            conversation_id=conv.id,
            is_read=False
        ).filter(ChatMessage.sender_id == other_id).count()
        total_unread += count

    return jsonify({'total_unread': total_unread}), 200


@api_bp.route('/users/online-status', methods=['GET'])
def get_online_users():
    return jsonify({'online_user_ids': list(active_users.keys())}), 200
