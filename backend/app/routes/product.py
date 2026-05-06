from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import Product, User, Comment, Favorite
from ..utils import allowed_file, save_image


@api_bp.route('/products', methods=['POST'])
@jwt_required()
def create_product():
    print("Received POST request to /api/products")
    print("Content-Type:", request.content_type)
    
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
        print("Form data keys:", list(data.keys()))
    else:
        data = request.get_json() or {}
        print("JSON data:", data)

    if data is None:
        print("Error: Invalid request data")
        return jsonify({'error': 'Invalid request data'}), 400

    try:
        user_id = int(get_jwt_identity())
        print("User ID from JWT:", user_id)
    except Exception as e:
        print("Error getting user ID from JWT:", e)
        return jsonify({'error': 'Invalid token'}), 401

    user = User.query.get(user_id)

    if not user:
        print("Error: User not found")
        return jsonify({'error': 'User not found'}), 404

    if 'title' not in data:
        print("Error: Missing title")
        return jsonify({'error': 'Missing required field: title'}), 400
    
    if 'price' not in data:
        print("Error: Missing price")
        return jsonify({'error': 'Missing required field: price'}), 400

    try:
        price = float(data['price'])
    except ValueError:
        print("Error: Invalid price format")
        return jsonify({'error': 'Invalid price format'}), 400

    if price <= 0:
        print("Error: Price must be positive")
        return jsonify({'error': 'Price must be positive'}), 400

    image_filename = None
    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
            image_filename = save_image(file, current_app.config['PRODUCT_FOLDER'], max_size=(800, 800))
            print("Image saved:", image_filename)

    product = Product(
        seller_id=user_id,
        title=data['title'],
        description=data.get('description', ''),
        price=price,
        category=data.get('category', '其他'),
        image=image_filename
    )

    db.session.add(product)
    db.session.commit()
    print("Product created successfully with ID:", product.id)

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
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')

    query = Product.query.filter_by(status='active')

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


@api_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product_detail(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    return jsonify({
        'product': product.to_dict()
    })


@api_bp.route('/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    user_id = int(get_jwt_identity())

    if product.seller_id != user_id:
        return jsonify({'error': 'You can only update your own products'}), 403

    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form
    else:
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

    if 'image' in request.files:
        file = request.files['image']
        if file and file.filename and allowed_file(file.filename, current_app.config['ALLOWED_EXTENSIONS']):
            image_filename = save_image(file, current_app.config['PRODUCT_FOLDER'], max_size=(800, 800))
            product.image = image_filename

    db.session.commit()

    return jsonify({
        'message': 'Product updated successfully',
        'product': product.to_dict()
    }), 200


@api_bp.route('/products/<int:product_id>/comments', methods=['GET'])
def get_product_comments(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    pagination = Comment.query.filter_by(product_id=product_id)\
        .order_by(Comment.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'comments': [c.to_dict() for c in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    })


@api_bp.route('/products/<int:product_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    data = request.get_json()

    if not data or 'content' not in data:
        return jsonify({'error': 'Missing comment content'}), 400

    content = data['content'].strip()
    if not content:
        return jsonify({'error': 'Comment content cannot be empty'}), 400

    if len(content) > 500:
        return jsonify({'error': 'Comment content cannot exceed 500 characters'}), 400

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    comment = Comment(
        product_id=product_id,
        user_id=user_id,
        content=content
    )

    db.session.add(comment)
    db.session.commit()

    return jsonify({
        'message': 'Comment added successfully',
        'comment': comment.to_dict()
    }), 201


@api_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    comment = Comment.query.get(comment_id)

    if not comment:
        return jsonify({'error': 'Comment not found'}), 404

    user_id = int(get_jwt_identity())

    if comment.user_id != user_id:
        return jsonify({'error': 'You can only delete your own comments'}), 403

    db.session.delete(comment)
    db.session.commit()

    return jsonify({
        'message': 'Comment deleted successfully'
    }), 200


@api_bp.route('/favorites', methods=['POST'])
@jwt_required()
def add_favorite():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    
    if 'product_id' not in data:
        return jsonify({'error': 'Missing product_id'}), 400
    
    product_id = data['product_id']
    
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    existing_favorite = Favorite.query.filter_by(user_id=user_id, product_id=product_id).first()
    if existing_favorite:
        return jsonify({'error': 'Product already in favorites'}), 400
    
    favorite = Favorite(user_id=user_id, product_id=product_id)
    db.session.add(favorite)
    db.session.commit()
    
    return jsonify({
        'message': 'Added to favorites',
        'favorite': favorite.to_dict()
    }), 201


@api_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    user_id = int(get_jwt_identity())
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = Favorite.query.filter_by(user_id=user_id)\
        .order_by(Favorite.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'favorites': [f.to_dict() for f in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    })


@api_bp.route('/favorites/<int:product_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite(product_id):
    user_id = int(get_jwt_identity())
    
    favorite = Favorite.query.filter_by(user_id=user_id, product_id=product_id).first()
    
    if not favorite:
        return jsonify({'error': 'Favorite not found'}), 404
    
    db.session.delete(favorite)
    db.session.commit()
    
    return jsonify({
        'message': 'Removed from favorites'
    }), 200


@api_bp.route('/favorites/check/<int:product_id>', methods=['GET'])
@jwt_required()
def check_favorite(product_id):
    user_id = int(get_jwt_identity())
    
    favorite = Favorite.query.filter_by(user_id=user_id, product_id=product_id).first()
    
    return jsonify({
        'is_favorite': favorite is not None
    }), 200


@api_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = Product.query.with_entities(Product.category).distinct().all()
    category_list = [cat[0] for cat in categories]
    
    return jsonify({
        'categories': category_list
    }), 200