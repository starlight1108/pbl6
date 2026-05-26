from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import Offer, Product, Notification
from datetime import datetime


@api_bp.route('/products/<int:product_id>/offers', methods=['POST'])
@jwt_required()
def create_offer(product_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    offered_price = data.get('offered_price')
    message = data.get('message', '')
    
    if not offered_price:
        return jsonify({'error': '报价不能为空'}), 400
    
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': '商品不存在'}), 404
    
    if product.seller_id == user_id:
        return jsonify({'error': '不能对自己的商品报价'}), 400
    
    if product.status != 'active':
        return jsonify({'error': '商品已下架或已售出'}), 400
    
    existing_offer = Offer.query.filter_by(
        product_id=product_id,
        buyer_id=user_id,
        status='pending'
    ).first()
    
    if existing_offer:
        return jsonify({'error': '您已有待处理的报价'}), 400
    
    offer = Offer(
        product_id=product_id,
        buyer_id=user_id,
        original_price=product.price,
        offered_price=offered_price,
        message=message
    )
    db.session.add(offer)
    
    notification = Notification(
        user_id=product.seller_id,
        type='offer',
        title=f'收到新报价：{product.title}',
        content=f'买家报价 ¥{offered_price}',
        related_id=offer.id,
        related_type='offer'
    )
    db.session.add(notification)
    
    db.session.commit()
    
    return jsonify({
        'message': '报价成功',
        'offer': offer.to_dict()
    }), 201


@api_bp.route('/products/<int:product_id>/offers', methods=['GET'])
@jwt_required()
def get_product_offers(product_id):
    user_id = int(get_jwt_identity())
    
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': '商品不存在'}), 404
    
    if product.seller_id != user_id:
        return jsonify({'error': '只有卖家可以查看报价'}), 403
    
    offers = Offer.query.filter_by(product_id=product_id).order_by(Offer.created_at.desc()).all()
    
    return jsonify({
        'offers': [o.to_dict() for o in offers]
    })


@api_bp.route('/offers/<int:offer_id>/accept', methods=['PUT'])
@jwt_required()
def accept_offer(offer_id):
    user_id = int(get_jwt_identity())
    
    offer = Offer.query.get(offer_id)
    if not offer:
        return jsonify({'error': '报价不存在'}), 404
    
    product = Product.query.get(offer.product_id)
    if not product or product.seller_id != user_id:
        return jsonify({'error': '无权处理此报价'}), 403
    
    if offer.status != 'pending':
        return jsonify({'error': '报价已处理'}), 400
    
    offer.status = 'accepted'
    product.status = 'sold'
    
    other_pending_offers = Offer.query.filter(
        Offer.product_id == offer.product_id,
        Offer.id != offer_id,
        Offer.status == 'pending'
    ).all()
    
    for other_offer in other_pending_offers:
        other_offer.status = 'rejected'
        notification = Notification(
            user_id=other_offer.buyer_id,
            type='offer',
            title=f'报价已拒绝：{product.title}',
            content='卖家已接受其他报价',
            related_id=other_offer.id,
            related_type='offer'
        )
        db.session.add(notification)
    
    notification = Notification(
        user_id=offer.buyer_id,
        type='offer',
        title=f'报价已接受：{product.title}',
        content=f'卖家接受了您的报价 ¥{offer.offered_price}',
        related_id=offer.id,
        related_type='offer'
    )
    db.session.add(notification)
    
    db.session.commit()
    
    return jsonify({
        'message': '报价已接受',
        'offer': offer.to_dict()
    })


@api_bp.route('/offers/<int:offer_id>/reject', methods=['PUT'])
@jwt_required()
def reject_offer(offer_id):
    user_id = int(get_jwt_identity())
    
    offer = Offer.query.get(offer_id)
    if not offer:
        return jsonify({'error': '报价不存在'}), 404
    
    product = Product.query.get(offer.product_id)
    if not product or product.seller_id != user_id:
        return jsonify({'error': '无权处理此报价'}), 403
    
    if offer.status != 'pending':
        return jsonify({'error': '报价已处理'}), 400
    
    offer.status = 'rejected'
    
    notification = Notification(
        user_id=offer.buyer_id,
        type='offer',
        title=f'报价已拒绝：{product.title}',
        content=f'卖家拒绝了您的报价 ¥{offer.offered_price}',
        related_id=offer.id,
        related_type='offer'
    )
    db.session.add(notification)
    
    db.session.commit()
    
    return jsonify({
        'message': '报价已拒绝',
        'offer': offer.to_dict()
    })


@api_bp.route('/my-offers', methods=['GET'])
@jwt_required()
def get_my_offers():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    
    query = Offer.query.filter_by(buyer_id=user_id)
    
    if status:
        query = query.filter_by(status=status)
    
    pagination = query.order_by(Offer.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'offers': [o.to_dict() for o in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })