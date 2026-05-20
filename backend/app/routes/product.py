from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from . import api_bp
from .. import db
from ..models import Product, User, Comment, Favorite, Offer
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
    seller_id = request.args.get('seller_id', type=int)
    status = request.args.get('status')

    query = Product.query

    if seller_id:
        query = query.filter_by(seller_id=seller_id)
    
    if status:
        query = query.filter_by(status=status)
    elif not seller_id:
        query = query.filter_by(status='active')

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


@api_bp.route('/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    user_id = int(get_jwt_identity())

    if product.seller_id != user_id:
        return jsonify({'error': 'You can only delete your own products'}), 403

    Comment.query.filter_by(product_id=product_id).delete()
    Favorite.query.filter_by(product_id=product_id).delete()

    db.session.delete(product)
    db.session.commit()

    return jsonify({'message': 'Product deleted successfully'}), 200


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


@api_bp.route('/offers', methods=['POST'])
@jwt_required()
def create_offer():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    
    if 'product_id' not in data:
        return jsonify({'error': 'Missing product_id'}), 400
    
    if 'offered_price' not in data:
        return jsonify({'error': 'Missing offered_price'}), 400
    
    product_id = data['product_id']
    product = Product.query.get(product_id)
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    if product.seller_id == user_id:
        return jsonify({'error': 'You cannot make an offer on your own product'}), 400
    
    if product.status != 'active':
        return jsonify({'error': 'Product is not available'}), 400
    
    try:
        offered_price = float(data['offered_price'])
    except ValueError:
        return jsonify({'error': 'Invalid price format'}), 400
    
    if offered_price <= 0:
        return jsonify({'error': 'Offered price must be positive'}), 400
    
    existing_offer = Offer.query.filter_by(product_id=product_id, buyer_id=user_id).first()
    
    if existing_offer:
        if existing_offer.status == 'pending':
            return jsonify({'error': 'You already have a pending offer for this product'}), 400
        else:
            # 更新已完成的议价为新的议价请求
            existing_offer.offered_price = offered_price
            existing_offer.original_price = product.price
            existing_offer.status = 'pending'
            existing_offer.message = data.get('message', '')
            existing_offer.updated_at = datetime.utcnow()
            db.session.commit()
            return jsonify({
                'message': 'Offer updated successfully',
                'offer': existing_offer.to_dict()
            }), 200
    
    offer = Offer(
        product_id=product_id,
        buyer_id=user_id,
        seller_id=product.seller_id,
        offered_price=offered_price,
        original_price=product.price,
        message=data.get('message', '')
    )
    
    db.session.add(offer)
    db.session.commit()
    
    return jsonify({
        'message': 'Offer created successfully',
        'offer': offer.to_dict()
    }), 201


@api_bp.route('/offers/seller', methods=['GET'])
@jwt_required()
def get_seller_offers():
    seller_id = int(get_jwt_identity())
    status = request.args.get('status', 'pending')
    product_id = request.args.get('product_id', type=int)
    
    query = Offer.query.filter_by(seller_id=seller_id)
    
    if status:
        query = query.filter_by(status=status)
    
    if product_id:
        query = query.filter_by(product_id=product_id)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = query.order_by(Offer.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'offers': [o.to_dict() for o in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    }), 200


@api_bp.route('/offers/buyer', methods=['GET'])
@jwt_required()
def get_buyer_offers():
    buyer_id = int(get_jwt_identity())
    status = request.args.get('status')
    
    query = Offer.query.filter_by(buyer_id=buyer_id)
    
    if status:
        query = query.filter_by(status=status)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    pagination = query.order_by(Offer.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'offers': [o.to_dict() for o in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    }), 200


@api_bp.route('/offers/<int:offer_id>/accept', methods=['POST'])
@jwt_required()
def accept_offer(offer_id):
    seller_id = int(get_jwt_identity())
    offer = Offer.query.get(offer_id)
    
    if not offer:
        return jsonify({'error': 'Offer not found'}), 404
    
    if offer.seller_id != seller_id:
        return jsonify({'error': 'You can only accept your own offers'}), 403
    
    if offer.status != 'pending':
        return jsonify({'error': 'Offer is not pending'}), 400
    
    offer.status = 'accepted'
    
    product = Product.query.get(offer.product_id)
    if product:
        product.price = offer.offered_price
    
    db.session.commit()
    
    return jsonify({
        'message': 'Offer accepted successfully',
        'offer': offer.to_dict()
    }), 200


@api_bp.route('/offers/<int:offer_id>/reject', methods=['POST'])
@jwt_required()
def reject_offer(offer_id):
    seller_id = int(get_jwt_identity())
    offer = Offer.query.get(offer_id)
    
    if not offer:
        return jsonify({'error': 'Offer not found'}), 404
    
    if offer.seller_id != seller_id:
        return jsonify({'error': 'You can only reject your own offers'}), 403
    
    if offer.status != 'pending':
        return jsonify({'error': 'Offer is not pending'}), 400
    
    offer.status = 'rejected'
    db.session.commit()
    
    return jsonify({
        'message': 'Offer rejected successfully',
        'offer': offer.to_dict()
    }), 200


@api_bp.route('/offers/<int:offer_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_offer(offer_id):
    buyer_id = int(get_jwt_identity())
    offer = Offer.query.get(offer_id)
    
    if not offer:
        return jsonify({'error': 'Offer not found'}), 404
    
    if offer.buyer_id != buyer_id:
        return jsonify({'error': 'You can only cancel your own offers'}), 403
    
    if offer.status != 'pending':
        return jsonify({'error': 'Only pending offers can be canceled'}), 400
    
    offer.status = 'canceled'
    db.session.commit()
    
    return jsonify({
        'message': 'Offer canceled successfully',
        'offer': offer.to_dict()
    }), 200