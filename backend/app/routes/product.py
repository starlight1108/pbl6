from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import Product, User


@api_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    data = request.get_json()
    if data is None:
        return jsonify({'error': 'Invalid JSON'}), 400

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'title' not in data or 'price' not in data:
        return jsonify({'error': 'Missing required fields: title, price'}), 400

    product = Product(
        seller_id=user_id,
        title=data['title'],
        description=data.get('description', ''),
        price=data['price'],
        category=data.get('category', '其他'),
        status='active'
    )

    db.session.add(product)
    db.session.commit()

    return jsonify({
        'message': 'Product created successfully',
        'product': product.to_dict()
    }), 201


@api_bp.route('/products', methods=['GET'])
def get_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    category = request.args.get('category')
    keyword = request.args.get('keyword')

    query = Product.query.filter_by(status='active')

    if category:
        query = query.filter_by(category=category)
    if keyword:
        query = query.filter(Product.title.contains(keyword))

    pagination = query.order_by(Product.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'products': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })


@api_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product_detail(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    return jsonify({
        'product': product.to_dict()
    })
