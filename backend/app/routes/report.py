from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import api_bp
from .. import db
from ..models import Report, Product, User, Notification


@api_bp.route('/reports', methods=['POST'])
@jwt_required()
def create_report():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    product_id = data.get('product_id')
    reason = data.get('reason')
    description = data.get('description', '')
    
    if not product_id or not reason:
        return jsonify({'error': '商品ID和举报原因不能为空'}), 400
    
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': '商品不存在'}), 404
    
    if product.seller_id == user_id:
        return jsonify({'error': '不能举报自己的商品'}), 400
    
    existing_report = Report.query.filter_by(
        product_id=product_id,
        reporter_id=user_id
    ).first()
    
    if existing_report:
        return jsonify({'error': '您已经举报过该商品'}), 400
    
    report = Report(
        product_id=product_id,
        reporter_id=user_id,
        reason=reason,
        description=description
    )
    
    db.session.add(report)
    db.session.commit()
    
    return jsonify({
        'message': '举报成功，我们会尽快处理',
        'report': report.to_dict()
    }), 201


@api_bp.route('/reports', methods=['GET'])
@jwt_required()
def get_reports():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    
    query = Report.query
    
    if status:
        query = query.filter_by(status=status)
    
    pagination = query.order_by(Report.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'reports': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page
    })


@api_bp.route('/reports/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report(report_id):
    report = Report.query.get(report_id)
    
    if not report:
        return jsonify({'error': '举报记录不存在'}), 404
    
    return jsonify({
        'report': report.to_dict()
    })


@api_bp.route('/reports/<int:report_id>/process', methods=['PUT'])
@jwt_required()
def process_report(report_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    new_status = data.get('status')
    action = data.get('action')
    
    if new_status not in ['approved', 'rejected']:
        return jsonify({'error': '无效的状态'}), 400
    
    report = Report.query.get(report_id)
    
    if not report:
        return jsonify({'error': '举报记录不存在'}), 404
    
    report.status = new_status
    
    if new_status == 'approved' and action == 'remove_product':
        product = Product.query.get(report.product_id)
        if product:
            product.status = 'removed'
            
            Notification(
                user_id=product.seller_id,
                type='system',
                title='商品已被下架',
                content=f'您的商品"{product.title}"因违规已被下架',
                related_id=product.id,
                related_type='product'
            )
    
    if new_status == 'approved':
        Notification(
            user_id=report.reporter_id,
            type='system',
            title='举报已处理',
            content=f'您举报的商品"{report.product.title}"已处理',
            related_id=report.product_id,
            related_type='product'
        )
    elif new_status == 'rejected':
        Notification(
            user_id=report.reporter_id,
            type='system',
            title='举报已处理',
            content=f'您举报的商品"{report.product.title}"未发现违规',
            related_id=report.product_id,
            related_type='product'
        )
    
    db.session.commit()
    
    return jsonify({
        'message': '举报已处理',
        'report': report.to_dict()
    })


@api_bp.route('/reports/check/<int:product_id>', methods=['GET'])
@jwt_required()
def check_reported(product_id):
    user_id = int(get_jwt_identity())
    
    report = Report.query.filter_by(
        product_id=product_id,
        reporter_id=user_id
    ).first()
    
    return jsonify({
        'has_reported': report is not None
    })