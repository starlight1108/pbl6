from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import Product, User, Comment, Favorite

def admin_required(fn):
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin permission required'}), 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper


@api_bp.route('/admin/products', methods=['GET'])
@jwt_required()
@admin_required
def get_all_products():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    category = request.args.get('category')
    keyword = request.args.get('keyword')
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    status = request.args.get('status')
    seller_id = request.args.get('seller_id', type=int)

    query = Product.query

    if seller_id:
        query = query.filter_by(seller_id=seller_id)
    
    if status:
        query = query.filter_by(status=status)

    if category:
        query = query.filter_by(category=category)

    if keyword:
        query = query.filter(Product.title.contains(keyword))

    sort_columns = {
        'created_at': Product.created_at,
        'price': Product.price,
        'title': Product.title
    }
    
    if sort_by in sort_columns:
        sort_column = sort_columns[sort_by]
        if sort_order == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(Product.created_at.desc())

    pagination = query.paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'products': [p.to_dict() for p in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    })


@api_bp.route('/admin/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def admin_delete_product(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    Comment.query.filter_by(product_id=product_id).delete()
    Favorite.query.filter_by(product_id=product_id).delete()

    db.session.delete(product)
    db.session.commit()

    return jsonify({'message': 'Product deleted successfully'}), 200


@api_bp.route('/admin/products/<int:product_id>/status', methods=['PUT'])
@jwt_required()
@admin_required
def admin_update_product_status(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    data = request.get_json() or {}
    
    if 'status' not in data:
        return jsonify({'error': 'Missing status field'}), 400

    allowed_status = ['active', 'inactive', 'sold']
    if data['status'] not in allowed_status:
        return jsonify({'error': f'Invalid status. Allowed: {allowed_status}'}), 400

    product.status = data['status']
    db.session.commit()

    return jsonify({
        'message': 'Product status updated successfully',
        'product': product.to_dict()
    }), 200


@api_bp.route('/admin/products/<int:product_id>', methods=['PUT'])
@jwt_required()
@admin_required
def admin_update_product(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    data = request.get_json() or {}

    if 'title' in data:
        product.title = data['title']
    if 'description' in data:
        product.description = data['description']
    if 'price' in data:
        try:
            product.price = float(data['price'])
        except ValueError:
            return jsonify({'error': 'Invalid price format'}), 400
    if 'category' in data:
        product.category = data['category']
    if 'status' in data:
        product.status = data['status']

    db.session.commit()

    return jsonify({
        'message': 'Product updated successfully',
        'product': product.to_dict()
    }), 200