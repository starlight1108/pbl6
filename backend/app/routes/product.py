from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import Product, User
from ..utils import allowed_file, save_image


@api_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
        data = request.get_json() or {}

    if data is None:
        return jsonify({'error': 'Invalid request data'}), 400

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if 'title' not in data or 'price' not in data:
        return jsonify({'error': 'Missing required fields: title, price'}), 400

    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
            image_filename = save_image(file, current_app.config['PRODUCT_FOLDER'], max_size=(800, 800))

    product = Product(
        seller_id=user_id,
        title=data['title'],
        description=data.get('description', ''),
        price=float(data['price']),
        category=data.get('category', '其他'),
        image=image_filename
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
        'current_page': pagination.page
    })


@api_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product_detail(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    return jsonify({
        'product': product.to_dict()
    })
