import uuid
from datetime import datetime, timedelta
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import Order, Product, User, Transaction
from .notification import create_notification


def generate_transaction_no():
    return f'TX{datetime.utcnow().strftime("%Y%m%d%H%M%S")}{uuid.uuid4().hex[:8].upper()}'


def check_order_permission(order, user_id):
    """检查用户是否为订单的买家或卖家"""
    return order.buyer_id == user_id or order.seller_id == user_id


# ─── 创建订单 ─────────────────────────────────────────────
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
    transaction_type = data.get('transaction_type', 'offline')
    if transaction_type not in ('offline', 'online'):
        return jsonify({'error': 'Invalid transaction_type, must be offline or online'}), 400

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

    # 检查是否已有进行中的订单
    active_statuses = ['pending', 'pending_confirm', 'pending_payment']
    existing_order = Order.query.filter(
        Order.product_id == product_id,
        Order.buyer_id == buyer_id,
        Order.status.in_(active_statuses)
    ).first()
    if existing_order:
        return jsonify({'error': 'You already have an active order for this product'}), 400

    # 初始状态：线下= pending, 线上= pending_confirm
    initial_status = 'pending' if transaction_type == 'offline' else 'pending_confirm'

    order = Order(
        product_id=product_id,
        buyer_id=buyer_id,
        seller_id=seller_id,
        final_price=final_price,
        transaction_type=transaction_type,
        status=initial_status
    )
    db.session.add(order)
    db.session.commit()

    # 通知卖家
    type_label = '线上' if transaction_type == 'online' else '线下'
    create_notification(
        user_id=seller_id,
        type='order',
        title='新的订单',
        content=f'买家 {order.buyer.nickname} 发起了{type_label}交易，金额 ¥{final_price:.2f}',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({
        'message': 'Order created successfully',
        'order': order.to_dict()
    }), 201


# ─── 获取订单列表 ─────────────────────────────────────────
@api_bp.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    user_id = int(get_jwt_identity())
    role = request.args.get('role', 'buy')
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    if role == 'sell':
        query = Order.query.filter_by(seller_id=user_id)
    else:
        query = Order.query.filter_by(buyer_id=user_id)

    if status:
        query = query.filter_by(status=status)

    pagination = query.order_by(Order.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'orders': [o.to_dict() for o in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page
    })


# ─── 获取订单详情 ─────────────────────────────────────────
@api_bp.route('/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order_detail(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if not check_order_permission(order, user_id):
        return jsonify({'error': 'You can only view your own orders'}), 403

    return jsonify({'order': order.to_dict()})


# ─── 线下：买家确认完成 ─────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/complete', methods=['PUT'])
@jwt_required()
def complete_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.buyer_id != user_id:
        return jsonify({'error': 'Only the buyer can confirm completion'}), 403
    if order.transaction_type == 'online':
        return jsonify({'error': '线上交易请使用确认收货接口'}), 400
    if order.status != 'pending':
        return jsonify({'error': 'Only pending orders can be completed'}), 400

    order.status = 'completed'
    product = order.product
    if product:
        product.status = 'sold'
    db.session.commit()

    create_notification(
        user_id=order.seller_id,
        type='order',
        title='订单已完成',
        content=f'买家已确认完成订单，商品：{order.product.title}',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({'message': 'Order completed successfully', 'order': order.to_dict()})


# ─── 取消订单（线下/线上未付款时适用）─────────────────────────
@api_bp.route('/orders/<int:order_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if not check_order_permission(order, user_id):
        return jsonify({'error': 'You can only cancel your own orders'}), 403

    cancelable_statuses = ['pending', 'pending_confirm', 'pending_payment']
    if order.status not in cancelable_statuses:
        return jsonify({'error': '当前状态不可取消'}), 400

    order.status = 'cancelled'
    db.session.commit()

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

    return jsonify({'message': 'Order cancelled successfully', 'order': order.to_dict()})


# ═══════════════════════════════════════════════════════════
# 以下为线上交易专用接口
# ═══════════════════════════════════════════════════════════

# ─── 卖家确认订单 ─────────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/confirm', methods=['PUT'])
@jwt_required()
def confirm_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.seller_id != user_id:
        return jsonify({'error': 'Only the seller can confirm the order'}), 403
    if order.transaction_type != 'online':
        return jsonify({'error': '仅线上交易需要确认'}), 400
    if order.status != 'pending_confirm':
        return jsonify({'error': '当前状态不可确认'}), 400

    order.status = 'pending_payment'
    db.session.commit()

    create_notification(
        user_id=order.buyer_id,
        type='order',
        title='卖家已确认订单',
        content=f'卖家已确认您的订单，请尽快付款，金额 ¥{order.final_price:.2f}',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({'message': 'Order confirmed', 'order': order.to_dict()})


# ─── 卖家关闭订单 ─────────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/close', methods=['PUT'])
@jwt_required()
def close_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.seller_id != user_id:
        return jsonify({'error': 'Only the seller can close the order'}), 403
    if order.transaction_type != 'online':
        return jsonify({'error': '仅线上交易可关闭'}), 400
    if order.status != 'pending_confirm':
        return jsonify({'error': '当前状态不可关闭'}), 400

    order.status = 'closed'
    db.session.commit()

    create_notification(
        user_id=order.buyer_id,
        type='order',
        title='卖家关闭了订单',
        content=f'卖家已关闭了您的订单，商品：{order.product.title}',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({'message': 'Order closed', 'order': order.to_dict()})


# ─── 买家付款 ─────────────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/pay', methods=['POST'])
@jwt_required()
def pay_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.buyer_id != user_id:
        return jsonify({'error': 'Only the buyer can pay'}), 403
    if order.transaction_type != 'online':
        return jsonify({'error': '仅线上交易可付款'}), 400
    if order.status != 'pending_payment':
        return jsonify({'error': '当前状态不可付款'}), 400

    # 模拟支付：创建付款交易流水
    order.status = 'paid'
    order.paid_at = datetime.utcnow()
    order.payment_method = 'balance'

    tx = Transaction(
        order_id=order.id,
        buyer_id=order.buyer_id,
        seller_id=order.seller_id,
        amount=order.final_price,
        type='pay',
        transaction_no=generate_transaction_no()
    )
    db.session.add(tx)
    db.session.commit()

    create_notification(
        user_id=order.seller_id,
        type='order',
        title='买家已付款',
        content=f'买家已付款 ¥{order.final_price:.2f}，请尽快交付商品',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({'message': 'Payment successful', 'order': order.to_dict()})


# ─── 卖家标记已发货 ───────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/deliver', methods=['PUT'])
@jwt_required()
def deliver_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.seller_id != user_id:
        return jsonify({'error': 'Only the seller can mark as delivered'}), 403
    if order.transaction_type != 'online':
        return jsonify({'error': '仅线上交易可发货'}), 400
    if order.status != 'paid':
        return jsonify({'error': '当前状态不可发货'}), 400

    data = request.get_json(silent=True) or {}
    tracking_number = (data or {}).get('tracking_number', '')

    order.status = 'delivered'
    order.delivery_method = 'shipped' if tracking_number else 'offline'
    order.tracking_number = tracking_number or None
    order.auto_complete_at = datetime.utcnow() + timedelta(days=7)
    db.session.commit()

    tracking_msg = f'，快递单号：{tracking_number}' if tracking_number else ''
    create_notification(
        user_id=order.buyer_id,
        type='order',
        title='卖家已发货',
        content=f'卖家已确认发货{tracking_msg}，请留意查收。7天内未确认将自动完成。',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({'message': 'Delivery confirmed', 'order': order.to_dict()})


# ─── 买家确认收货 ─────────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/receive', methods=['PUT'])
@jwt_required()
def receive_order(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.buyer_id != user_id:
        return jsonify({'error': 'Only the buyer can confirm receipt'}), 403
    if order.transaction_type != 'online':
        return jsonify({'error': '仅线上交易可确认收货'}), 400
    if order.status != 'delivered':
        return jsonify({'error': '当前状态不可确认收货'}), 400

    order.status = 'completed'
    product = order.product
    if product:
        product.status = 'sold'
    db.session.commit()

    create_notification(
        user_id=order.seller_id,
        type='order',
        title='买家已确认收货',
        content=f'交易完成，商品：{order.product.title}',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({'message': 'Receipt confirmed, transaction completed', 'order': order.to_dict()})


# ─── 自动确认收货 ─────────────────────────────────────────
@api_bp.route('/orders/auto-complete', methods=['POST'])
@jwt_required()
def auto_complete_orders():
    """手动触发自动确认收货检查（生产环境应由定时任务调用）"""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin only'}), 403

    now = datetime.utcnow()
    expired = Order.query.filter(
        Order.status == 'delivered',
        Order.auto_complete_at.isnot(None),
        Order.auto_complete_at <= now
    ).all()

    count = 0
    for order in expired:
        order.status = 'completed'
        product = order.product
        if product:
            product.status = 'sold'
        count += 1
    db.session.commit()

    return jsonify({'message': f'Auto-completed {count} orders'})


# ─── 买家申请退款 ─────────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/refund-request', methods=['POST'])
@jwt_required()
def refund_request(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.buyer_id != user_id:
        return jsonify({'error': 'Only the buyer can request refund'}), 403
    if order.transaction_type != 'online':
        return jsonify({'error': '仅线上交易可退款'}), 400
    if order.status not in ('paid', 'delivered'):
        return jsonify({'error': '当前状态不可申请退款'}), 400

    order.status = 'refunding'
    db.session.commit()

    create_notification(
        user_id=order.seller_id,
        type='order',
        title='买家申请退款',
        content=f'买家申请退款，金额 ¥{order.final_price:.2f}，请及时处理',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({'message': 'Refund requested', 'order': order.to_dict()})


# ─── 卖家同意退款 ─────────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/refund-agree', methods=['PUT'])
@jwt_required()
def refund_agree(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.seller_id != user_id:
        return jsonify({'error': 'Only the seller can agree refund'}), 403
    if order.transaction_type != 'online':
        return jsonify({'error': '仅线上交易可退款'}), 400
    if order.status != 'refunding':
        return jsonify({'error': '当前状态不可同意退款'}), 400

    order.status = 'refunded'
    # 创建退款交易流水
    tx = Transaction(
        order_id=order.id,
        buyer_id=order.buyer_id,
        seller_id=order.seller_id,
        amount=order.final_price,
        type='refund',
        transaction_no=generate_transaction_no()
    )
    db.session.add(tx)
    db.session.commit()

    create_notification(
        user_id=order.buyer_id,
        type='order',
        title='退款成功',
        content=f'卖家已同意退款，金额 ¥{order.final_price:.2f} 已退回',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({'message': 'Refund agreed, money returned', 'order': order.to_dict()})


# ─── 卖家拒绝退款 ─────────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/refund-reject', methods=['PUT'])
@jwt_required()
def refund_reject(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if order.seller_id != user_id:
        return jsonify({'error': 'Only the seller can reject refund'}), 403
    if order.transaction_type != 'online':
        return jsonify({'error': '仅线上交易可退款'}), 400
    if order.status != 'refunding':
        return jsonify({'error': '当前状态不可拒绝退款'}), 400

    order.status = 'disputed'
    db.session.commit()

    create_notification(
        user_id=order.buyer_id,
        type='order',
        title='退款被拒绝',
        content='卖家拒绝了退款申请，平台管理员将介入处理',
        related_id=order.id,
        related_type='order'
    )

    return jsonify({'message': 'Refund rejected, dispute created', 'order': order.to_dict()})


# ─── 获取交易流水 ─────────────────────────────────────────
@api_bp.route('/orders/<int:order_id>/transactions', methods=['GET'])
@jwt_required()
def get_transactions(order_id):
    user_id = int(get_jwt_identity())
    order = Order.query.get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    if not check_order_permission(order, user_id):
        return jsonify({'error': 'You can only view your own orders'}), 403

    transactions = Transaction.query.filter_by(order_id=order_id).order_by(Transaction.created_at.asc()).all()
    return jsonify({'transactions': [t.to_dict() for t in transactions]})
