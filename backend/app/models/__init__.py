from datetime import datetime
from .. import db
import bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    nickname = db.Column(db.String(50))
    avatar = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship('Product', backref='seller', lazy='dynamic')

    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self):
        default_avatar = '/static/images/default-avatar.png'
        avatar_url = f'/uploads/avatars/{self.avatar}' if self.avatar else default_avatar

        return {
            'id': self.id,
            'email': self.email,
            'nickname': self.nickname,
            'avatar': avatar_url,
            'created_at': self.created_at.isoformat()
        }


class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    category = db.Column(db.String(50), default='其他')
    image = db.Column(db.String(200))
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    comments = db.relationship('Comment', backref='product', lazy='dynamic')

    def to_dict(self):
        default_image = '/static/images/default-product.png'
        image_url = f'/uploads/products/{self.image}' if self.image else default_image

        seller_info = None
        if self.seller:
            seller_info = {
                'id': self.seller.id,
                'nickname': self.seller.nickname
            }
        return {
            'id': self.id,
            'seller_id': self.seller_id,
            'seller': seller_info,
            'title': self.title,
            'description': self.description,
            'price': float(self.price) if self.price else None,
            'category': self.category,
            'image': image_url,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'comment_count': self.comments.count()
        }


class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')

    def to_dict(self):
        user_info = None
        if self.user:
            user_info = {
                'id': self.user.id,
                'nickname': self.user.nickname,
                'avatar': f'/uploads/avatars/{self.user.avatar}' if self.user.avatar else '/static/images/default-avatar.png'
            }
        return {
            'id': self.id,
            'product_id': self.product_id,
            'user': user_info,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        }


class Favorite(db.Model):
    __tablename__ = 'favorites'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship('Product')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'product_id', name='_user_product_unique'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'product_id': self.product_id,
            'product': self.product.to_dict() if self.product else None,
            'created_at': self.created_at.isoformat()
        }


class Offer(db.Model):
    __tablename__ = 'offers'

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    offered_price = db.Column(db.Numeric(10, 2), nullable=False)
    original_price = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20), default='pending')
    message = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = db.relationship('Product')
    buyer = db.relationship('User', foreign_keys=[buyer_id])
    seller = db.relationship('User', foreign_keys=[seller_id])

    __table_args__ = (
        db.UniqueConstraint('product_id', 'buyer_id', name='_product_buyer_unique'),
    )

    def to_dict(self):
        buyer_info = None
        if self.buyer:
            buyer_info = {
                'id': self.buyer.id,
                'nickname': self.buyer.nickname,
                'avatar': f'/static/avatars/{self.buyer.avatar}' if self.buyer.avatar else '/static/images/default-avatar.png'
            }
        
        return {
            'id': self.id,
            'product_id': self.product_id,
            'product': self.product.to_dict() if self.product else None,
            'buyer_id': self.buyer_id,
            'buyer': buyer_info,
            'seller_id': self.seller_id,
            'offered_price': float(self.offered_price) if self.offered_price else None,
            'original_price': float(self.original_price) if self.original_price else None,
            'status': self.status,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class ChatConversation(db.Model):
    __tablename__ = 'chat_conversations'

    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    last_message = db.Column(db.Text)
    last_message_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    buyer = db.relationship('User', foreign_keys=[buyer_id])
    seller = db.relationship('User', foreign_keys=[seller_id])
    product = db.relationship('Product')

    messages = db.relationship('ChatMessage', backref='conversation', lazy='dynamic',
                                order_by='ChatMessage.created_at.asc()')

    __table_args__ = (
        db.UniqueConstraint('buyer_id', 'seller_id', 'product_id', name='_conv_participants_unique'),
    )

    def to_dict(self, current_user_id=None):
        other_user = self.seller if self.buyer_id == current_user_id else self.buyer
        unread_count = ChatMessage.query.filter_by(
            conversation_id=self.id, sender_id=other_user.id, is_read=False
        ).count() if current_user_id else 0

        return {
            'id': self.id,
            'buyer_id': self.buyer_id,
            'seller_id': self.seller_id,
            'product_id': self.product_id,
            'product_title': self.product.title if self.product else None,
            'product_image': f'/uploads/products/{self.product.image}' if self.product and self.product.image else None,
            'other_user': {
                'id': other_user.id,
                'nickname': other_user.nickname,
                'avatar': f'/uploads/avatars/{other_user.avatar}' if other_user.avatar else '/static/images/default-avatar.png'
            },
            'last_message': self.last_message,
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
            'unread_count': unread_count,
            'created_at': self.created_at.isoformat()
        }


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('chat_conversations.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sender = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'sender_id': self.sender_id,
            'sender_nickname': self.sender.nickname if self.sender else None,
            'sender_avatar': f'/uploads/avatars/{self.sender.avatar}' if self.sender and self.sender.avatar else '/static/images/default-avatar.png',
            'content': self.content,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text)
    related_id = db.Column(db.Integer)
    related_type = db.Column(db.String(50))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'content': self.content,
            'related_id': self.related_id,
            'related_type': self.related_type,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }