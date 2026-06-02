from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import Order, Product, User
from .notification import create_notification


@api_bp.route('/orders', methods=['POST'])
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    if 'product_id' not in data:
        return jsonify({'error': 'Missing product_id'}), 400

    if 'final_price' not in data:
        return jsonify({'error': 'Missing final_price'}), 400

    product_id = data['product_id']
    product = Product.query.get(product_id)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    if product.seller_id == user_id:
        return jsonify({'error': 'You cannot create an order for your own product'}), 400

    if product.status != 'active':
        return jsonify({'error': 'Product is not available'}), 400

    try:
        final_price = float(data['final_price'])
    except ValueError:
        return jsonify({'error': 'Invalid price format'}), 400

    if final_price <= 0:
        return jsonify({'error': 'Price must be positive'}), 400

    buyer_id = user_id
    seller_id = product.seller_id

    # 检查是否已有进行中的订单（pending 状态）
    existing_order = Order.query.filter_by(
        product_id=product_id, buyer_id=buyer_id, status='pending'
    ).first()
    if existing_order:
        return jsonify({'error': 'You already have a pending order for this product'}), 400

    order = Order(
        product_id=product_id,
        buyer_id=buyer_id,
        seller_id=seller_id,
        final_price=final_price
    )

    db.session.add(order)
    db.session.commit()

    # 发送订单通知给卖家
    create_notification(
        user_id=seller_id,
        type='order',
        title='新的订单',
        content=f'买家 {order.buyer.nickname} 创建了一笔订单，金额 ¥{final_price:.2f}',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({
        'message': 'Order created successfully',
        'order': order.to_dict()
    }), 201


@api_bp.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = int(get_jwt_identity())
    role = request.args.get('role', 'buy')  # 'buy' 或 'sell'
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    if role == 'sell':
        query = Order.query.filter_by(seller_id=user_id)
    else:
        query = Order.query.filter_by(buyer_id=user_id)

    pagination = query.order_by(Order.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'orders': [o.to_dict() for o in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    })


@api_bp.route('/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_detail(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)

    if not order:
        return jsonify({'error': 'Order not found'}), 404

    if order.buyer_id != user_id and order.seller_id != user_id:
        return jsonify({'error': 'You can only view your own orders'}), 403

    return jsonify({
        'order': order.to_dict()
    })


@api_bp.route('/orders/<int:order_id>/complete', methods=['PUT'])
@jwt_required()
def complete_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)

    if not order:
        return jsonify({'error': 'Order not found'}), 404

    if order.buyer_id != user_id:
        return jsonify({'error': 'Only the buyer can confirm completion'}), 403

    if order.status != 'pending':
        return jsonify({'error': 'Only pending orders can be completed'}), 400

    order.status = 'completed'
    db.session.commit()

    # 通知卖家
    create_notification(
        user_id=order.seller_id,
        type='order',
        title='订单已完成',
        content=f'买家已确认完成订单，商品：{order.product.title}',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({
        'message': 'Order completed successfully',
        'order': order.to_dict()
    })


@api_bp.route('/orders/<int:order_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)

    if not order:
        return jsonify({'error': 'Order not found'}), 404

    if order.buyer_id != user_id and order.seller_id != user_id:
        return jsonify({'error': 'You can only cancel your own orders'}), 403

    if order.status != 'pending':
        return jsonify({'error': 'Only pending orders can be canceled'}), 400

    order.status = 'cancelled'
    db.session.commit()

    # 通知对方
    notify_user_id = order.seller_id if user_id == order.buyer_id else order.buyer_id
    canceler_nickname = order.buyer.nickname if user_id == order.buyer_id else order.seller.nickname
    create_notification(
        user_id=notify_user_id,
        type='order',
        title='订单已取消',
        content=f'{canceler_nickname} 取消了订单，商品：{order.product.title}',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({
        'message': 'Order cancelled successfully',
        'order': order.to_dict()
    })
