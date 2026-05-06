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
        avatar_url = f'/static/avatars/{self.avatar}' if self.avatar else default_avatar

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
        image_url = f'/static/products/{self.image}' if self.image else default_image

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
                'avatar': f'/static/avatars/{self.user.avatar}' if self.user.avatar else '/static/images/default-avatar.png'
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